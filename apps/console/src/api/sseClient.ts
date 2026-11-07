/**
 * Minimal SSE consumer that supports an Authorization header — the
 * built-in EventSource doesn't. Connects through `authFetch`, so it sends
 * the session's token and renews it on a 401, then reads the
 * ReadableStream with a tiny frame parser. Each call returns an
 * AbortController; cancel via `controller.abort()` to close the connection.
 *
 * Frame format (RFC EventSource subset we care about):
 *
 *   event: <name>\n
 *   data: <payload>\n
 *   \n
 *
 * Lines without `event:` use the default event name (`message`).
 * Comments (`:` lines, e.g. keep-alives) are ignored.
 */
import { authFetch } from './apiClient';

export interface SseEvent {
  event: string;
  data: string;
}

export interface SseOptions {
  url: string;
  onEvent: (e: SseEvent) => void;
  /** Optional connect-success hook (after headers come back 2xx). */
  onOpen?: () => void;
  /** Called when connecting or reading fails; caller may reconnect. */
  onError?: (err: unknown) => void;
  /** Called when the server ends the stream; caller may reconnect. */
  onClose?: () => void;
  /** Optional AbortSignal upstream caller can plug into. */
  signal?: AbortSignal;
}

export function openSseStream(opts: SseOptions): AbortController {
  const controller = new AbortController();
  if (opts.signal) {
    if (opts.signal.aborted) {
      controller.abort();
      return controller;
    }
    opts.signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  void (async () => {
    try {
      const res = await authFetch(opts.url, {
        method: 'GET',
        headers: { accept: 'text/event-stream' },
        signal: controller.signal,
        // Keep-alive needed for long-lived streams behind some proxies.
        cache: 'no-store',
      });
      if (!res.ok || !res.body) {
        throw new Error(`SSE connect failed: HTTP ${res.status.toString()}`);
      }
      opts.onOpen?.();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buf += decoder.decode(value, { stream: true });
        // SSE frames are separated by a blank line.
        let split = buf.indexOf('\n\n');
        while (split !== -1) {
          const frame = buf.slice(0, split);
          buf = buf.slice(split + 2);
          const evt = parseFrame(frame);
          if (evt) {
            opts.onEvent(evt);
          }
          split = buf.indexOf('\n\n');
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        opts.onError?.(err);
      }
      return;
    }
    if (!controller.signal.aborted) {
      opts.onClose?.();
    }
  })();

  return controller;
}

function parseFrame(frame: string): SseEvent | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const raw of frame.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line === '' || line.startsWith(':')) {
      continue;
    }
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, ''); // strip one leading space
    if (field === 'event') {
      event = value;
    } else if (field === 'data') {
      dataLines.push(value);
    }
  }
  if (dataLines.length === 0) {
    return null;
  }
  return { event, data: dataLines.join('\n') };
}
