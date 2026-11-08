import { type ReactNode, useState } from 'react';

import {
  Button as AegisButton,
  Chip,
  CodeBlock,
  ColumnLayout,
  FileTree,
  type FileTreeFile,
  MetricLabel,
  Panel,
  PanelTitle,
  SectionDivider,
  Terminal,
} from '@lincyaw/aegis-ui';

import { TERMINAL_LINES } from '../fixtures';
import { Specimen } from '../shared';

interface GalleryTaskFile extends FileTreeFile {
  language: string;
  code: string;
}

const GALLERY_TASK_FILES: GalleryTaskFile[] = [
  {
    path: 'instruction.md',
    note: '2.1 KB',
    language: 'markdown',
    code: '# Export latency after a rollback\n\nFind why batch exports stall and submit an answer.',
  },
  {
    path: 'environment/Dockerfile',
    note: '1.4 KB',
    language: 'dockerfile',
    code: 'FROM python:3.13-slim\nCOPY app/ /srv/app/\nCMD ["python", "/srv/app/server.py"]',
  },
  {
    path: 'environment/app/server.py',
    note: '8.2 KB',
    language: 'python',
    code: 'from http.server import ThreadingHTTPServer\n\nserve(ThreadingHTTPServer(("", 8080), Handler))',
  },
  {
    path: 'tests/grading.toml',
    note: '3.0 KB',
    language: 'toml',
    code: '[grading]\nverdict = "all"\n\n[[case]]\nid = "no_dml"\nscript = "cases/no_dml.py"',
  },
  {
    path: 'tests/cases/no_dml.py',
    note: '1.1 KB',
    language: 'python',
    code: 'def check(answer):\n    return "DELETE" not in answer.sql',
  },
  {
    path: 'tests/cases/replica_lag_within_budget_after_rollback.py',
    note: '2.4 KB',
    language: 'python',
    code: 'def check(metrics):\n    return metrics.replica_lag_s < 5',
  },
  {
    path: 'solution/solve.sh',
    note: '420 B',
    language: 'bash',
    code: 'psql -f /solution/fix.sql',
  },
];

type GalleryFileChange = 'added' | 'modified' | 'deleted';

/** A commit's files compared with its parent's. */
const GALLERY_COMMIT_CHANGES: Record<string, GalleryFileChange | undefined> = {
  'backend/src/orders/lifecycle/service.py': 'modified',
  'backend/src/orders/lifecycle/test_contract.py': 'added',
  'frontend/src/orders/PayCountdown.tsx': 'added',
};

const GALLERY_COMMIT_FILES: FileTreeFile[] = [
  'README.md',
  'backend/src/catalog/service.py',
  'backend/src/orders/lifecycle/contract.py',
  'backend/src/orders/lifecycle/service.py',
  'backend/src/orders/lifecycle/test_contract.py',
  'frontend/src/App.tsx',
  'frontend/src/orders/PayCountdown.tsx',
].map((path) => {
  const change = GALLERY_COMMIT_CHANGES[path];
  return {
    path,
    note: change ? (
      <Chip size='sm' tone='default'>
        {change}
      </Chip>
    ) : undefined,
  };
});

function changedBelow(_path: string, files: FileTreeFile[]): ReactNode {
  const changed = files.filter(
    (file) => GALLERY_COMMIT_CHANGES[file.path] !== undefined
  ).length;
  return changed > 0 ? `${String(changed)} changed` : undefined;
}

function FileTreeSpecimen(): ReactNode {
  const [selected, setSelected] = useState('tests/grading.toml');
  const file = GALLERY_TASK_FILES.find((row) => row.path === selected);
  return (
    <div style={{ width: '100%' }}>
      <ColumnLayout columns='400fr 712fr' gap='md'>
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          <FileTree
            files={GALLERY_TASK_FILES}
            ariaLabel='Task files'
            selectedPath={selected}
            onSelect={setSelected}
            defaultExpandedPaths={['tests/']}
          />
        </div>
        <CodeBlock
          code={file?.code ?? ''}
          language={file?.language}
          maxHeight={240}
          showLineNumbers
        />
      </ColumnLayout>
    </div>
  );
}

const GALLERY_NOTE_FILES: FileTreeFile[] = [
  'ops/runbooks/rollback.md',
  'ops/runbooks/replica-lag.md',
  'ops/oncall.md',
  'research/rca/evaluation-notes.md',
  'index.md',
].map((path) => ({
  path,
  label: path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, ''),
}));

const GALLERY_TASK_DIRECTORIES = [
  'environment/',
  'environment/app/',
  'solution/',
  'tests/',
  'tests/cases/',
];

function FileTreeControlledSpecimen(): ReactNode {
  const [openPaths, setOpenPaths] = useState(['tests/']);
  return (
    <div className='gallery__stack gallery__stack--fill'>
      <div style={{ width: '100%', maxWidth: 320 }}>
        <FileTree
          files={GALLERY_TASK_FILES}
          ariaLabel='Task files, controlled'
          expandedPaths={openPaths}
          onExpandedPathsChange={setOpenPaths}
        />
      </div>
      <div className='gallery__row'>
        <AegisButton
          tone='secondary'
          onClick={() => setOpenPaths(GALLERY_TASK_DIRECTORIES)}
        >
          全部展开
        </AegisButton>
        <AegisButton tone='secondary' onClick={() => setOpenPaths([])}>
          全部收起
        </AegisButton>
        <MetricLabel>{openPaths.length} open</MetricLabel>
      </div>
    </div>
  );
}

export function LogsSection() {
  return (
    <Panel title={<PanelTitle size='lg'>Logs — Terminal</PanelTitle>}>
      <SectionDivider>Terminal · plain</SectionDivider>
      <Terminal
        lines={TERMINAL_LINES}
        surface={{
          id: 'gallery.terminal.plain',
          kind: 'terminal',
          label: 'Experiment log',
          askSuggestions: ['Summarize the log', 'Anything anomalous?'],
          project: (lines) => ({
            fields: [
              { name: 'lineCount', type: 'number', value: lines.length },
              {
                name: 'lastLine',
                type: 'string',
                value: lines[lines.length - 1]?.body ?? '',
              },
            ],
          }),
        }}
      />

      <SectionDivider>Terminal · with log levels</SectionDivider>
      <Terminal
        lines={[
          {
            ts: '14:22:01',
            prefix: 'debug',
            level: 'debug',
            body: 'Worker pool initialized with 4 threads.',
          },
          {
            ts: '14:22:05',
            prefix: 'info',
            level: 'info',
            body: 'Experiment "playing-the-world" started.',
          },
          {
            ts: '14:23:12',
            prefix: 'warn',
            level: 'warn',
            body: 'Latency variance exceeds baseline by 15%.',
          },
          {
            ts: '14:23:18',
            prefix: 'error',
            level: 'error',
            body: 'Data consistency thresholds breached in node 04.',
          },
        ]}
      />

      <SectionDivider>CodeBlock</SectionDivider>
      <div className='gallery__row'>
        <Specimen caption='json' span={2}>
          <CodeBlock
            language='json'
            code={
              '{\n  "service": "catalog",\n  "metric": "latency_p99",\n  "value": 482,\n  "unit": "ms"\n}'
            }
            surface={{
              id: 'gallery.codeblock.json',
              kind: 'code',
              label: 'JSON snippet',
              askSuggestions: ['Explain this JSON'],
              project: (data) => ({
                fields: [
                  { name: 'language', type: 'string', value: data.language },
                  {
                    name: 'lines',
                    type: 'number',
                    value: data.code.split('\n').length,
                  },
                ],
              }),
            }}
          />
        </Specimen>
        <Specimen caption='bash' span={2}>
          <CodeBlock
            language='bash'
            code={
              "kubectl apply -f injection.yaml\nwatch -n 1 'kubectl get pods'"
            }
          />
        </Specimen>
        <Specimen caption='any language string · typescript' span={2}>
          <CodeBlock
            language='typescript'
            showLineNumbers
            code={
              "const latency = await probe('catalog');\nif (latency.p99 > 400) {\n  alert(latency);\n}"
            }
          />
        </Specimen>
        <Specimen caption='maxHeight={120} · scrolls inside' span={2}>
          <CodeBlock
            language='json'
            maxHeight={120}
            code={JSON.stringify(
              {
                verdict: 'failed',
                checks: Array.from({ length: 8 }, (_, i) => ({
                  id: `check-${String(i + 1)}`,
                  passed: i % 3 !== 0,
                })),
              },
              null,
              2
            )}
          />
        </Specimen>
      </div>

      <SectionDivider extra={<MetricLabel>File browser</MetricLabel>}>
        FileTree
      </SectionDivider>
      <div className='gallery__stack'>
        <Specimen
          caption='click or arrow keys · Enter opens a file · Left/Right fold · beside a CodeBlock'
          span={3}
        >
          <FileTreeSpecimen />
        </Specimen>
        <div className='gallery__row'>
          <Specimen
            caption='directories collapsed · note = file count'
            span={2}
          >
            <div style={{ width: '100%', maxWidth: 320 }}>
              <FileTree
                files={GALLERY_TASK_FILES}
                ariaLabel='Task files, collapsed'
              />
            </div>
          </Specimen>
          <Specimen
            caption='selected · long names end in an ellipsis, the title shows the path'
            span={2}
          >
            <div style={{ width: '100%', maxWidth: 240 }}>
              <FileTree
                files={GALLERY_TASK_FILES}
                ariaLabel='Task files, narrow'
                selectedPath='tests/cases/replica_lag_within_budget_after_rollback.py'
                defaultExpandedPaths={['tests/']}
              />
            </div>
          </Specimen>
          <Specimen
            caption='directoryNote · a commit against its parent; collapsed directories count their changed files'
            span={2}
          >
            <div style={{ width: '100%', maxWidth: 360 }}>
              <FileTree
                files={GALLERY_COMMIT_FILES}
                ariaLabel='Changed files'
                directoryNote={changedBelow}
                defaultExpandedPaths={['frontend/']}
              />
            </div>
          </Specimen>
          <Specimen
            caption='controlled · expandedPaths + onExpandedPathsChange'
            span={2}
          >
            <FileTreeControlledSpecimen />
          </Specimen>
          <Specimen
            caption='fileHref · file rows are links, so a new tab or a copied address works; Enter follows the link'
            span={2}
          >
            <div style={{ width: '100%', maxWidth: 280 }}>
              <FileTree
                files={GALLERY_TASK_FILES}
                ariaLabel='Task files, links'
                fileHref={(path) =>
                  `https://example.com/tasks/export-latency/${path}`
                }
                fileTarget='_blank'
                defaultExpandedPaths={['environment/']}
              />
            </div>
          </Specimen>
          <Specimen
            caption='label · a file shows its label in place of its name, e.g. notes without .md; the title keeps the path'
            span={2}
          >
            <div style={{ width: '100%', maxWidth: 280 }}>
              <FileTree
                files={GALLERY_NOTE_FILES}
                ariaLabel='Notes'
                selectedPath='ops/runbooks/rollback.md'
              />
            </div>
          </Specimen>
        </div>
      </div>
    </Panel>
  );
}
