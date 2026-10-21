#!/usr/bin/env node
/**
 * Fails when a CSS custom property is read with var(--name) but never
 * defined anywhere in the library or the console. An undefined variable
 * doesn't error in the browser; the declaration silently falls back to
 * its inherited or initial value.
 *
 * A property counts as defined when some file declares `--name:` in CSS,
 * sets `'--name': …` in a style object, or calls setProperty('--name').
 * Variables owned by third-party libraries (--xy-*, --ant-*) are skipped.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN = ['packages/ui/src', 'apps/console/src'];
const THIRD_PARTY = /^--(xy|ant)-/;

const files = execFileSync('git', ['ls-files', ...SCAN], {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .split('\n')
  .filter((f) => /\.(css|tsx?)$/.test(f));

const defined = new Set();
const used = new Map();

for (const file of files) {
  const src = readFileSync(resolve(repoRoot, file), 'utf8');
  for (const re of [
    /(--[\w-]+)\s*:/g,
    /['"](--[\w-]+)['"]\s*:/g,
    /setProperty\(\s*['"](--[\w-]+)/g,
  ]) {
    for (const m of src.matchAll(re)) {
      defined.add(m[1]);
    }
  }
  for (const m of src.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (!used.has(m[1])) {
      used.set(m[1], new Set());
    }
    used.get(m[1]).add(file);
  }
}

const missing = [...used.entries()]
  .filter(([name]) => !defined.has(name) && !THIRD_PARTY.test(name))
  .sort(([a], [b]) => a.localeCompare(b));

if (missing.length > 0) {
  console.log(`Undefined CSS custom properties (${missing.length}):`);
  for (const [name, where] of missing) {
    console.log(`  ${name}  ←  ${[...where].sort().join(', ')}`);
  }
  console.log(
    '\nDefine the token in packages/ui/src/styles/theme.css or use an existing one.',
  );
  process.exit(1);
}

console.log(`All ${used.size} CSS custom properties in use are defined.`);
