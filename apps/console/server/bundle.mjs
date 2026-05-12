#!/usr/bin/env node
// Wrapper around `go build` that:
//   1. Mirrors apps/console/dist into apps/console/server/dist (the embed
//      staging directory, since //go:embed only sees siblings).
//   2. Resolves the version string from $AEGIS_CONSOLE_VERSION,
//      $GITHUB_REF_NAME, or `git describe`.
//   3. Cross-compiles via GOOS/GOARCH per target and writes
//      apps/console/bin/<name>.
//
// Usage:
//   node server/bundle.mjs            # current host
//   node server/bundle.mjs <target>   # one of the keys below

import { execFileSync, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const consoleDir = dirname(here);
const srcDist = join(consoleDir, 'dist');
const stageDist = join(here, 'dist');
const binDir = join(consoleDir, 'bin');

const TARGETS = {
  host: { goos: null, goarch: null, out: 'aegis-console' },
  'linux-x64': { goos: 'linux', goarch: 'amd64', out: 'aegis-console-linux-x64' },
  'linux-arm64': { goos: 'linux', goarch: 'arm64', out: 'aegis-console-linux-arm64' },
  'macos-x64': { goos: 'darwin', goarch: 'amd64', out: 'aegis-console-darwin-x64' },
  'macos-arm64': { goos: 'darwin', goarch: 'arm64', out: 'aegis-console-darwin-arm64' },
  'windows-x64': { goos: 'windows', goarch: 'amd64', out: 'aegis-console-windows-x64.exe' },
};

const which = process.argv[2] ?? 'host';
const cfg = TARGETS[which];
if (!cfg) {
  console.error(`Unknown target "${which}". Choices: ${Object.keys(TARGETS).join(', ')}`);
  process.exit(2);
}

function resolveVersion() {
  const env = process.env.AEGIS_CONSOLE_VERSION || process.env.GITHUB_REF_NAME;
  if (env) {
    return env.replace(/^console-v/, '').replace(/^v/, '');
  }
  try {
    const out = execFileSync('git', ['describe', '--tags', '--always', '--dirty'], {
      encoding: 'utf8',
    }).trim();
    return out || 'dev';
  } catch {
    return 'dev';
  }
}

async function syncDist() {
  await fs.rm(stageDist, { recursive: true, force: true });
  await fs.mkdir(stageDist, { recursive: true });
  // Re-create the .gitkeep so the directory remains valid for go:embed
  // even if the SPA build is missing.
  await fs.writeFile(join(stageDist, '.gitkeep'), '');
  try {
    await fs.cp(srcDist, stageDist, { recursive: true });
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    console.warn(`No ${srcDist} — skipping (run \`pnpm build\` first for a usable binary).`);
  }
}

async function main() {
  await syncDist();
  await fs.mkdir(binDir, { recursive: true });

  const version = resolveVersion();
  const out = join(binDir, cfg.out);
  console.log(`Building ${out} (version=${version}, goos=${cfg.goos ?? 'host'}, goarch=${cfg.goarch ?? 'host'})`);

  const env = { ...process.env, CGO_ENABLED: '0' };
  if (cfg.goos) {
    env.GOOS = cfg.goos;
  }
  if (cfg.goarch) {
    env.GOARCH = cfg.goarch;
  }

  const args = [
    'build',
    '-trimpath',
    '-ldflags', `-s -w -X main.version=${version}`,
    '-o', out,
    '.',
  ];

  const res = spawnSync('go', args, {
    cwd: here,
    stdio: 'inherit',
    env,
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

await main();
