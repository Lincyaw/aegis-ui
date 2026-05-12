#!/usr/bin/env node
/**
 * Gallery specimen coverage audit (north-star target #2).
 *
 * Compares public primitive exports of:
 *   - `packages/ui/src/components/ui/index.ts`
 *   - `packages/ui/src/agent/index.ts`        (UI components only — see UI_RULE)
 * against the labelled specimens in `apps/console/src/Gallery.tsx`.
 *
 * UI_RULE for `agent/`: only exports whose source file matches
 *   - PascalCase + `.tsx`
 *   - file name does NOT end in `Provider` or `Context`
 *   - identifier does NOT start with `use` (i.e. is not a hook)
 * are required to ship a Gallery specimen. This intentionally allowlists
 * `AskOverlay` and `AskPanel` (and any future `Ask*.tsx` UI exports) while
 * skipping types, runtime methods (`AegisRuntime`, `createAegisRuntime`,
 * `buildAskContext`, …), hooks (`useAegis*`), and context providers
 * (`AegisAgentProvider`, `AgentProvider`).
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
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = resolve(
  repoRoot,
  'packages/ui/src/components/ui/index.ts',
);
const AGENT_INDEX_PATH = resolve(repoRoot, 'packages/ui/src/agent/index.ts');
const AGENT_DIR = resolve(repoRoot, 'packages/ui/src/agent');
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
 * Legacy components/ui scan: pull the *module* name from every
 * `export … from './<Name>'`. This intentionally aggregates type-only and
 * value re-exports under the module name, mirroring the original heuristic
 * (every `.tsx` primitive ships under a module name that matches its
 * required Gallery specimen).
 */
function collectModuleExports(src) {
  const names = new Set();
  const re = /export\s+(?:type\s+)?(?:\{[^}]*\}|\*)\s+from\s+['"]\.\/([A-Z][A-Za-z0-9]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    names.add(m[1]);
  }
  return [...names].sort();
}

/**
 * Per-identifier scan used for `agent/index.ts`. Returns
 * `{ name, sourceModule, isType }` so we can apply the UI_RULE filter.
 */
function collectIdentifierExports(src) {
  const out = [];

  // Form A: `export … from './Source'` where the brace block lists names.
  const reBraced = /export\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]\.\/([A-Za-z0-9_]+)['"]/g;
  let m;
  while ((m = reBraced.exec(src)) !== null) {
    const isType = Boolean(m[1]);
    const sourceModule = m[3];
    const inside = m[2];
    for (const raw of inside.split(',')) {
      const piece = raw.trim();
      if (!piece) {
        continue;
      }
      // strip leading `type ` on individual specifiers
      const cleaned = piece.replace(/^type\s+/, '');
      // `default as Foo` or `Foo as Bar` → take the alias (last identifier)
      const asMatch = cleaned.match(/\bas\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/);
      const name = asMatch ? asMatch[1] : cleaned;
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        out.push({ name, sourceModule, isType: isType || /^type\s+/.test(piece) });
      }
    }
  }

  // Form B: `export * from './Source'` — the source module name is the export
  // (matches the legacy regex behaviour for the components/ui barrel).
  const reStar = /export\s+(type\s+)?\*\s+from\s+['"]\.\/([A-Z][A-Za-z0-9_]+)['"]/g;
  while ((m = reStar.exec(src)) !== null) {
    const isType = Boolean(m[1]);
    const sourceModule = m[2];
    out.push({ name: sourceModule, sourceModule, isType });
  }

  return out;
}

/**
 * For an export from `agent/`, decide if it's a UI component that should
 * ship a Gallery specimen. See UI_RULE in the file header.
 */
function isAgentUiExport(exp) {
  if (exp.isType) {
    return false;
  }
  // hooks: `useAegis*`, `useAgent`, etc.
  if (/^use[A-Z]/.test(exp.name)) {
    return false;
  }
  const tsxPath = resolve(AGENT_DIR, `${exp.sourceModule}.tsx`);
  // Source file must be a `.tsx` (component) — `.ts` files are non-UI.
  if (!existsSync(tsxPath)) {
    return false;
  }
  // Skip Context/Provider wrappers regardless of the .tsx suffix.
  if (/(Provider|Context)$/.test(exp.sourceModule)) {
    return false;
  }
  if (/(Provider|Context)$/.test(exp.name)) {
    return false;
  }
  // Identifier must look component-shaped (PascalCase).
  if (!/^[A-Z][A-Za-z0-9]+$/.test(exp.name)) {
    return false;
  }
  return true;
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
  const agentSrc = readSource(AGENT_INDEX_PATH);
  const gallerySrc = readSource(GALLERY_PATH);

  // From `components/ui/index.ts`: legacy "module name = required specimen".
  const uiExports = collectModuleExports(indexSrc);

  // From `agent/index.ts`: filter to UI components only via UI_RULE.
  const agentExports = collectIdentifierExports(agentSrc)
    .filter(isAgentUiExport)
    .map((e) => e.name);

  // Union, deduped, sorted.
  const exports = [...new Set([...uiExports, ...agentExports])].sort();

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
  console.log(`    components/ui:    ${uiExports.length}`);
  console.log(`    agent (UI only):  ${agentExports.length}  [${agentExports.join(', ')}]`);
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
