#!/usr/bin/env node
/**
 * Locale catalogue audit.
 *
 * Loads `enStrings` and `zhCNStrings` from
 * `packages/ui/src/locale/strings.ts` (transpiled in memory, so the file may
 * import types but no runtime module) and fails when:
 *   - a key is in one catalogue and not the other,
 *   - a key holds a different kind of value in each (text, function, map),
 *   - a zh-CN text equals its en text, i.e. it was left untranslated.
 *
 * A map (an object value such as `serviceMapAriaLabels`) is compared the
 * same way one level down. An empty en map is skipped: it stands for the
 * wrapped library's own English, as `codeEditorPhrases` does.
 *
 * Exit code 0 when the catalogues match, 1 otherwise. Run via
 *   pnpm check:locale
 *
 * Add a key to SAME_TEXT_ALLOWED only when both languages genuinely use the
 * same text — every entry needs a justification comment.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STRINGS_PATH = resolve(repoRoot, 'packages/ui/src/locale/strings.ts');

/** Keys whose zh-CN text is deliberately the same as the en text. */
const SAME_TEXT_ALLOWED = new Set([
  // (empty — every text has its own zh-CN wording)
]);

async function loadCatalogues() {
  let source;
  try {
    source = readFileSync(STRINGS_PATH, 'utf8');
  } catch (err) {
    console.error(`cannot read ${STRINGS_PATH}: ${err.message}`);
    process.exit(2);
  }
  const { outputText } = ts.transpileModule(source, {
    fileName: STRINGS_PATH,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  if (/^\s*import\s/m.test(outputText)) {
    console.error(
      `${STRINGS_PATH} imports a runtime module; check:locale can only load a catalogue that imports types.`,
    );
    process.exit(2);
  }
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  return import(url);
}

function kindOf(value) {
  if (typeof value === 'function') {
    return 'function';
  }
  if (typeof value === 'string') {
    return 'text';
  }
  if (value !== null && typeof value === 'object') {
    return 'map';
  }
  return typeof value;
}

function childName(parent, key) {
  return parent === '' ? key : `${parent}[${JSON.stringify(key)}]`;
}

function compare(en, zh, parent, counts, problems) {
  for (const key of Object.keys(zh)) {
    if (!(key in en)) {
      problems.push(`${childName(parent, key)}: missing in enStrings`);
    }
  }
  for (const [key, enValue] of Object.entries(en)) {
    const name = childName(parent, key);
    if (!(key in zh)) {
      problems.push(`${name}: missing in zhCNStrings`);
      continue;
    }
    const zhValue = zh[key];
    const kind = kindOf(enValue);
    if (kind !== kindOf(zhValue)) {
      problems.push(
        `${name}: ${kind} in enStrings, ${kindOf(zhValue)} in zhCNStrings`,
      );
      continue;
    }
    counts[kind] = (counts[kind] ?? 0) + 1;
    if (
      kind === 'text' &&
      enValue === zhValue &&
      !SAME_TEXT_ALLOWED.has(name)
    ) {
      problems.push(`${name}: zh-CN text equals the en text "${enValue}"`);
    }
    if (kind === 'map' && Object.keys(enValue).length > 0) {
      compare(enValue, zhValue, name, counts, problems);
    }
  }
}

async function main() {
  const { enStrings, zhCNStrings } = await loadCatalogues();
  const counts = {};
  const problems = [];
  compare(enStrings, zhCNStrings, '', counts, problems);

  console.log('Locale catalogue parity');
  console.log(
    `  keys:       ${Object.keys(enStrings).length} in enStrings, ${Object.keys(zhCNStrings).length} in zhCNStrings`,
  );
  console.log(`  texts:      ${counts.text ?? 0}`);
  console.log(`  functions:  ${counts.function ?? 0}`);
  console.log(`  maps:       ${counts.map ?? 0}`);
  console.log(`  allowed:    ${SAME_TEXT_ALLOWED.size}`);

  if (problems.length > 0) {
    console.log(`\nProblems (${problems.length}):`);
    for (const problem of problems) {
      console.log(`  - ${problem}`);
    }
    console.log(
      '\nAction: give both catalogues the same keys, with a value of the same' +
        ' kind and zh-CN wording of its own, in packages/ui/src/locale/strings.ts.',
    );
    process.exit(1);
  }

  console.log(
    '\nBoth catalogues have the same keys, and every zh-CN text is translated.',
  );
}

await main();
