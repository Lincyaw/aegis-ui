#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const DEFAULT_CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function usage() {
  return `Usage: node probe-devtools.mjs <url> [--chrome <path>] [--port <port>] [--wait-ms <ms>] [--viewport <WxH>] [--screenshot <path>]

Starts a clean headless Chrome, connects through the DevTools Protocol, reloads
the target URL, and prints DOM state plus runtime/console/network errors.`;
}

function parseArgs(argv) {
  const args = {
    url: '',
    chrome: DEFAULT_CHROME,
    port: 0,
    waitMs: 5000,
    viewport: { width: 1440, height: 1000 },
    screenshot: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }
    if (arg === '--chrome') {
      args.chrome = argv[++i] ?? '';
      continue;
    }
    if (arg === '--port') {
      args.port = Number(argv[++i] ?? 0);
      continue;
    }
    if (arg === '--wait-ms') {
      args.waitMs = Number(argv[++i] ?? 5000);
      continue;
    }
    if (arg === '--viewport') {
      const raw = argv[++i] ?? '';
      const match = raw.match(/^(\d+)x(\d+)$/i);
      if (!match) {
        throw new Error('--viewport must use WIDTHxHEIGHT, e.g. 1440x1000');
      }
      args.viewport = {
        width: Number(match[1]),
        height: Number(match[2]),
      };
      continue;
    }
    if (arg === '--screenshot') {
      args.screenshot = argv[++i] ?? '';
      continue;
    }
    if (!args.url) {
      args.url = arg;
      continue;
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }
  if (!args.url) {
    throw new Error(usage());
  }
  if (!Number.isFinite(args.waitMs) || args.waitMs < 0) {
    throw new Error('--wait-ms must be a non-negative number');
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithInit(url, init, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForDevtools(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const deadline = Date.now() + 10000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      await fetchJson(endpoint, 1000);
      return;
    } catch (error) {
      lastError = error;
      await sleep(200);
    }
  }
  throw new Error(
    `Timed out waiting for Chrome DevTools on ${endpoint}: ${String(lastError)}`,
  );
}

function connect(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const events = {
    exceptions: [],
    consoleErrors: [],
    networkErrors: [],
  };

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id).resolve(message);
      pending.delete(message.id);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      events.exceptions.push({
        text: details.exception?.description ?? details.text,
        url: details.url,
        line: details.lineNumber,
        column: details.columnNumber,
      });
    }
    if (
      message.method === 'Console.messageAdded' &&
      message.params.message.level === 'error'
    ) {
      events.consoleErrors.push(message.params.message.text);
    }
    if (
      message.method === 'Log.entryAdded' &&
      message.params.entry.level === 'error'
    ) {
      events.consoleErrors.push(message.params.entry.text);
    }
    if (message.method === 'Network.loadingFailed') {
      events.networkErrors.push({
        requestId: message.params.requestId,
        errorText: message.params.errorText,
        blockedReason: message.params.blockedReason,
        canceled: message.params.canceled,
      });
    }
  });

  function send(method, params = {}, timeoutMs = 8000) {
    const messageId = ++id;
    ws.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(messageId);
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      pending.set(messageId, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
      });
    });
  }

  return {
    events,
    send,
    waitOpen: () =>
      new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve, { once: true });
        ws.addEventListener('error', reject, { once: true });
      }),
    close: () => ws.close(),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const port = args.port || 9222 + Math.floor(Math.random() * 1000);
  const profile = mkdtempSync(join(tmpdir(), 'aegis-ui-chrome-debug-'));
  const chrome = spawn(args.chrome, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${args.viewport.width},${args.viewport.height}`,
    '--ignore-certificate-errors',
    '--disable-extensions',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  let stderr = '';
  chrome.stderr.setEncoding('utf8');
  chrome.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  try {
    await waitForDevtools(port);
    let tabs = await fetchJson(`http://127.0.0.1:${port}/json`);
    let tab = tabs.find(
      (target) =>
        target.type === 'page' && !String(target.url).startsWith('chrome-extension://'),
    );
    if (!tab) {
      await fetchJsonWithInit(
        `http://127.0.0.1:${port}/json/new?about:blank`,
        { method: 'PUT' },
      );
      tabs = await fetchJson(`http://127.0.0.1:${port}/json`);
      tab = tabs.find(
        (target) =>
          target.type === 'page' &&
          !String(target.url).startsWith('chrome-extension://'),
      );
    }
    if (!tab?.webSocketDebuggerUrl) {
      throw new Error('Chrome did not expose a debuggable tab');
    }

    const cdp = connect(tab.webSocketDebuggerUrl);
    await cdp.waitOpen();
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Console.enable').catch(() => null);
    await cdp.send('Network.enable');
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: args.viewport.width,
      height: args.viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Page.navigate', { url: args.url });
    await sleep(args.waitMs);

    const stateResult = await cdp.send('Runtime.evaluate', {
      expression: `({
        href: location.href,
        title: document.title,
        bodyText: document.body.innerText.slice(0, 2000),
        rootChildren: document.getElementById('root')?.children.length ?? -1,
        rootHtmlLength: document.getElementById('root')?.innerHTML.length ?? -1
      })`,
      returnByValue: true,
    });
    if (args.screenshot) {
      const image = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
      });
      writeFileSync(args.screenshot, Buffer.from(image.result.data, 'base64'));
    }
    cdp.close();

    console.log(
      JSON.stringify(
        {
          url: args.url,
          viewport: args.viewport,
          state: stateResult.result.result.value,
          exceptions: cdp.events.exceptions,
          consoleErrors: cdp.events.consoleErrors,
          networkErrors: cdp.events.networkErrors,
          screenshot: args.screenshot || null,
          chromeStderrTail: stderr.split('\n').slice(-20).join('\n'),
        },
        null,
        2,
      ),
    );
  } finally {
    chrome.kill('SIGTERM');
    setTimeout(() => {
      rmSync(profile, { recursive: true, force: true });
    }, 250);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
