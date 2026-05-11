#!/usr/bin/env node
/**
 * Gallery specimen coverage audit (north-star target #2).
 *
 * Compares the public primitive exports of `packages/ui/src/components/ui/index.ts`
 * against the labelled specimens in `apps/console/src/Gallery.tsx`.
 *
 * A primitive is considered "covered" if its name appears in the text of any
 * `<SectionDivider>…</SectionDivider>` block — including multi-line dividers
 * and dividers that carry an `extra={…}` prop (which the legacy single-line
 * grep in CLAUDE.md cannot see).
 *
 * Exit code 0 when coverage = 100%, exit code 1 otherwise. Run via
 *   pnpm check:gallery
 *
 * Add a primitive to the IGNORED set only if there is a deliberate decision
 * not to ship a Gallery specimen — every entry needs a justification comment.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = resolve(
  repoRoot,
  'packages/ui/src/components/ui/index.ts',
);
const GALLERY_PATH = resolve(repoRoot, 'apps/console/src/Gallery.tsx');

/** Primitives intentionally omitted from the gallery. Keep small. */
const IGNORED = new Set([
  // (empty — every export should ship a specimen)
]);

function readSource(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    console.error(`cannot read ${path}: ${err.message}`);
    process.exit(2);
  }
}

/**
 * Pull every `export … from './<Name>'` re-export out of the barrel file.
 * Handles `export { Foo } from './Foo'`, `export * from './Foo'`,
 * `export { default as Foo } from './Foo'`, and `export type …`.
 */
function collectExports(src) {
  const names = new Set();
  const re = /export\s+(?:type\s+)?(?:\{[^}]*\}|\*)\s+from\s+['"]\.\/([A-Z][A-Za-z0-9]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    names.add(m[1]);
  }
  return [...names].sort();
}

/**
 * Extract the visible text inside every `<SectionDivider …>…</SectionDivider>`.
 * Strips JSX expressions (`{…}`) and HTML entities so we get plain words.
 * Multi-line dividers and `extra={…}` props are both handled.
 */
function collectDividerTexts(src) {
  const out = [];
  const open = /<SectionDivider\b/g;
  let m;
  while ((m = open.exec(src)) !== null) {
    const start = m.index;
    // Find the matching `>` that closes the opening tag, skipping `{…}` blocks.
    let i = m.index + m[0].length;
    let depth = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
      } else if (ch === '>' && depth === 0) {
        break;
      }
      i++;
    }
    if (i >= src.length) {
      continue;
    }
    const bodyStart = i + 1;
    const closeIdx = src.indexOf('</SectionDivider>', bodyStart);
    if (closeIdx < 0) {
      continue;
    }
    const body = src.slice(bodyStart, closeIdx);
    // Strip JSX expression containers and tags, collapse whitespace.
    const cleaned = body
      .replace(/\{[^{}]*\}/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned) {
      out.push({ text: cleaned, offset: start });
    }
  }
  return out;
}

/** Word-boundary lookup against the union of all divider texts. */
function isCovered(name, dividerTexts) {
  const re = new RegExp(`\\b${name}\\b`);
  return dividerTexts.some((d) => re.test(d.text));
}

function main() {
  const indexSrc = readSource(INDEX_PATH);
  const gallerySrc = readSource(GALLERY_PATH);

  const exports = collectExports(indexSrc);
  const dividerTexts = collectDividerTexts(gallerySrc);

  const covered = [];
  const missing = [];
  for (const name of exports) {
    if (IGNORED.has(name)) {
      continue;
    }
    if (isCovered(name, dividerTexts)) {
      covered.push(name);
    } else {
      missing.push(name);
    }
  }

  const total = exports.length - IGNORED.size;
  const pct = total === 0 ? 100 : ((covered.length / total) * 100).toFixed(1);

  console.log(`Gallery specimen coverage (NS#2)`);
  console.log(`  exports scanned:    ${exports.length}`);
  console.log(`  ignored:            ${IGNORED.size}`);
  console.log(`  divider blocks:     ${dividerTexts.length}`);
  console.log(`  covered:            ${covered.length} / ${total}  (${pct}%)`);

  if (missing.length > 0) {
    console.log(`\nMissing specimens (${missing.length}):`);
    for (const name of missing) {
      console.log(`  - ${name}`);
    }
    console.log(
      `\nAction: add a <SectionDivider>${missing[0]}</SectionDivider>` +
        ` block in apps/console/src/Gallery.tsx with a working specimen,` +
        ` then verify in light + dark at desktop + ≤768 px.`,
    );
    process.exit(1);
  }

  console.log('\nAll public primitives have at least one labelled specimen.');
}

main();
