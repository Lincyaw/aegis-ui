#!/usr/bin/env node
/**
 * Locale translation audit.
 *
 * Loads `enStrings` and `zhCNStrings` from
 * `packages/ui/src/locale/strings.ts` (transpiled in memory, so the file may
 * import types but no runtime module) and fails when zh-CN reads the same as
 * en:
 *   - a zh-CN text equals its en text, or
 *   - a function key returns the same text in both languages for one of its
 *     sample arguments in SAMPLES below.
 *
 * Every function key needs SAMPLES, so a new one fails here until it has
 * some; a SAMPLES entry for a key that is no longer a function fails too.
 * Choose arguments that reach each branch: every member of an enum
 * argument, and a count of 1 beside a larger count.
 *
 * A map (an object value such as `serviceMapAriaLabels`) is audited the same
 * way one level down. An empty en map is skipped: it stands for the wrapped
 * library's own English, as `codeEditorPhrases` does.
 *
 * Type-check already makes both catalogues `AegisStrings`, so this script
 * does not compare their keys or the kinds of their values.
 *
 * Exit code 0 when every zh-CN text and sampled output is translated, 1
 * otherwise. Run via
 *   pnpm check:locale
 *
 * Add a key, or a sampled call as printed in a problem, to SAME_TEXT_ALLOWED
 * only when both languages genuinely read the same; every entry needs a
 * justification comment.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STRINGS_PATH = resolve(repoRoot, 'packages/ui/src/locale/strings.ts');

/** Keys or sampled calls whose zh-CN text is deliberately the en text. */
const SAME_TEXT_ALLOWED = new Set([
  // (empty — every text has its own zh-CN wording)
]);

const SAMPLE_DATE = new Date(2026, 10, 8, 15, 57);

/** Argument lists each function key is called with, one array per call. */
const SAMPLES = {
  barValue: [['0.75', '1.00']],
  paretoChartLabel: [['latency', 'cost']],
  runPipsLabel: [
    [{ passed: 1, failed: 0, errored: 0, pending: 0, total: 1 }],
    [{ passed: 3, failed: 1, errored: 1, pending: 2, total: 7 }],
  ],
  shareLinkTtl: [[900], [7200], [86400], [604800]],
  shareLinkExpiresIn: [
    [{ hours: 2, minutes: 5, seconds: 0 }],
    [{ hours: 0, minutes: 59, seconds: 12 }],
    [{ hours: 0, minutes: 0, seconds: 1 }],
  ],
  trajectoryStatus: [['running'], ['completed'], ['failed']],
  trajectoryActionType: [['tool_call'], ['message'], ['internal']],
  toolCallStatus: [['running'], ['ok'], ['error']],
  traceSpanTiming: [['1.2s', '300ms']],
  traceSpanStatus: [['ok'], ['error'], ['unset']],
  traceSpanField: [
    ['name'],
    ['status'],
    ['kind'],
    ['start'],
    ['duration'],
    ['parent'],
    ['id'],
  ],
  alertTone: [['info'], ['success'], ['warning'], ['error']],
  replayStepOf: [[1, 5]],
  replayKeyMoment: [[2]],
  scrollStoryPosition: [[1, 4]],
  deleteNamed: [['report.csv']],
  moreActionsFor: [['report.csv']],
  pinNamed: [['failed runs']],
  unpinNamed: [['failed runs']],
  relativeTime: [
    [{ unit: 'now' }],
    [{ unit: 'minutes', count: 1 }],
    [{ unit: 'minutes', count: 5 }],
    [{ unit: 'hours', count: 1 }],
    [{ unit: 'hours', count: 3 }],
    [{ unit: 'yesterday' }],
    [{ unit: 'days', count: 2 }],
    [{ unit: 'date', date: SAMPLE_DATE }],
  ],
  formatDateTime: [[SAMPLE_DATE]],
  environmentsRetry: [['Network error.']],
  authSignInTo: [['Portal']],
  authForbiddenRoles: [
    ['Portal', ['admin'], ['viewer']],
    ['Portal', ['admin', 'editor'], []],
  ],
  authForbidden: [['Portal']],
  authPasswordTooShort: [[1], [8]],
  authPasswordHint: [[1], [8]],
  commandStatus: [['pending'], ['success'], ['error']],
  inspectorContentKind: [['json'], ['markdown'], ['sql'], ['text']],
  contentDuplicates: [[1], [3]],
  dropzoneMaxSize: [['10 MB']],
  folderDropzoneSelected: [
    [1, '2 KB'],
    [12, '3.4 MB'],
  ],
  folderDropzoneTooMany: [[1200, 1000]],
  folderDropzoneFileTooLarge: [['big.bin', '2 GB', '1 GB']],
  folderDropzoneTotalTooLarge: [['5 GB', '4 GB']],
  filePreviewFailed: [['404 Not Found']],
  selectionCount: [[1], [1234]],
  parquetRows: [[1], [1234]],
  parquetColumns: [[1], [7]],
  querySyntax: [
    ['exact'],
    ['phrase'],
    ['wildcard'],
    ['range'],
    ['boolean'],
    ['grouping'],
  ],
  moreCount: [[3]],
  stepStatus: [['complete'], ['current'], ['unavailable']],
  themeToggle: [['light'], ['dark'], ['system']],
  timeRangeLast: [
    [{ amount: 1, unit: 'hour' }],
    [{ amount: 1.5, unit: 'hour' }],
    [{ amount: 500, unit: 'millisecond' }],
    [{ amount: 30, unit: 'second' }],
    [{ amount: 15, unit: 'minute' }],
    [{ amount: 7, unit: 'day' }],
    [{ amount: 2, unit: 'week' }],
    [{ amount: 1, unit: 'year' }],
  ],
  notSerialisable: [['circular reference']],
  uploadsDone: [[1, 3]],
  uploadEta: [['2 min 3 s']],
  uploadStatus: [['queued'], ['uploading'], ['done'], ['error']],
  avatarStatus: [['online'], ['offline'], ['busy'], ['away']],
  'serviceMapAriaLabels["node.a11yDescription.ariaLiveMessage"]': [
    [{ direction: 'left', x: 10, y: 20 }],
  ],
  serviceMapEdgeName: [['gateway', 'auth-service']],
  notificationBellLabel: [[0], [1], [12]],
  unreadCount: [[1], [12]],
  notificationsLoadFailedNote: [['Network error.']],
  notificationsStaleNote: [['Network error.']],
  inboxUnread: [[0], [3]],
  notificationSeverity: [['info'], ['success'], ['warning'], ['error']],
  askToolsAvailable: [[0], [3]],
  agentmSendFailed: [['Network error.']],
};

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

function childName(parent, key) {
  return parent === '' ? key : `${parent}[${JSON.stringify(key)}]`;
}

function callName(name, args) {
  return `${name}(${args.map((arg) => JSON.stringify(arg)).join(', ')})`;
}

function audit(en, zh, parent, counts, sampled, problems) {
  for (const [key, enValue] of Object.entries(en)) {
    const name = childName(parent, key);
    const zhValue = zh[key];
    if (typeof enValue === 'string') {
      counts.texts += 1;
      if (enValue === zhValue && !SAME_TEXT_ALLOWED.has(name)) {
        problems.push(`${name}: zh-CN text equals the en text "${enValue}"`);
      }
    } else if (typeof enValue === 'function') {
      counts.functions += 1;
      const samples = SAMPLES[name];
      if (samples === undefined) {
        problems.push(
          `${name}: no sample arguments; add an entry to SAMPLES in scripts/check-locale.mjs`,
        );
        continue;
      }
      sampled.add(name);
      for (const args of samples) {
        counts.calls += 1;
        const call = callName(name, args);
        const enText = enValue(...args);
        if (enText === zhValue(...args) && !SAME_TEXT_ALLOWED.has(call)) {
          problems.push(`${call}: zh-CN returns the en text "${enText}"`);
        }
      }
    } else if (Object.keys(enValue).length > 0) {
      counts.maps += 1;
      audit(enValue, zhValue, name, counts, sampled, problems);
    }
  }
}

async function main() {
  const { enStrings, zhCNStrings } = await loadCatalogues();
  const counts = { texts: 0, functions: 0, calls: 0, maps: 0 };
  const sampled = new Set();
  const problems = [];
  audit(enStrings, zhCNStrings, '', counts, sampled, problems);
  for (const name of Object.keys(SAMPLES)) {
    if (!sampled.has(name)) {
      problems.push(
        `SAMPLES["${name}"]: not a function key of the catalogue; remove it`,
      );
    }
  }

  console.log('Locale translation audit');
  console.log(`  texts:      ${counts.texts}`);
  console.log(
    `  functions:  ${counts.functions}, called ${counts.calls} times with samples`,
  );
  console.log(`  maps:       ${counts.maps}`);
  console.log(`  allowed:    ${SAME_TEXT_ALLOWED.size}`);

  if (problems.length > 0) {
    console.log(`\nProblems (${problems.length}):`);
    for (const problem of problems) {
      console.log(`  - ${problem}`);
    }
    console.log(
      '\nAction: give the zh-CN catalogue its own wording in' +
        ' packages/ui/src/locale/strings.ts, and sample every function key.',
    );
    process.exit(1);
  }

  console.log(
    '\nEvery zh-CN text, and every function key’s zh-CN output for its samples, differs from the en.',
  );
}

await main();
