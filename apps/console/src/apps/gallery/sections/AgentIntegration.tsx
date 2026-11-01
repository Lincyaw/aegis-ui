import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type AegisAction,
  Button as AegisButton,
  type AegisSearchResult,
  DataList,
  type DataListColumn,
  MetricLabel,
  Panel,
  PanelTitle,
  type SearchProvider,
  SectionDivider,
  TextField,
  useAegisAction,
  useAegisSearchProvider,
  useAegisSurface,
} from '@lincyaw/aegis-ui';

import { Specimen } from '../shared';

interface DemoDataset {
  id: string;
  name: string;
  status: string;
}

const DEMO_DATASETS: DemoDataset[] = [
  { id: 'ds-001', name: 'wikitext-103', status: 'ready' },
  { id: 'ds-002', name: 'imagenet-mini', status: 'syncing' },
  { id: 'ds-003', name: 'common-crawl-en', status: 'ready' },
  { id: 'ds-004', name: 'cifar-10', status: 'archived' },
];

function AgentIntegrationSpecimen(): ReactNode {
  const [log, setLog] = useState<string[]>([]);
  const [debug, setDebug] = useState<string>('(waiting for runtime)');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>('');

  const toastAction: AegisAction<void, string> = {
    id: 'gallery.demo.toast',
    label: 'Show toast',
    description: 'Appends a timestamped line to the local log.',
    appliesTo: { surfaceKind: 'list' },
    run: () => {
      const stamp = new Date().toISOString().slice(11, 19);
      const line = `[${stamp}] toast fired via agent runtime`;
      setLog((prev) => [...prev.slice(-9), line]);
      return line;
    },
  };

  const selectAction: AegisAction<{ id: string }, { id: string }> = {
    id: 'gallery.demo.select-dataset',
    label: 'Select dataset',
    description: 'Marks one demo dataset row as selected.',
    run: ({ id }) => {
      setSelectedId(id);
      return { id };
    },
  };

  const fillAction: AegisAction<{ value: string }, { value: string }> = {
    id: 'gallery.demo.fill-input',
    label: 'Fill agent demo input',
    description: 'Writes an arbitrary string into the demo input field.',
    run: ({ value }) => {
      setInputValue(value);
      return { value };
    },
  };

  useAegisAction(selectAction);
  useAegisAction(fillAction);

  // Demo SearchProvider — surfaces entities NOT currently mounted, so the
  // probe can verify the `source: 'provider'` path without seeding the
  // visible list with extra rows.
  const deepDatasets = useMemo<SearchProvider>(
    () => ({
      id: 'gallery.demo.deep-datasets',
      appId: 'gallery',
      kinds: ['entity'],
      search: (query) => {
        const candidates = [
          { id: 'ds-100', label: 'wikitext-v3-shadow' },
          { id: 'ds-200', label: 'imagenet-archive' },
        ];
        const q = query.toLowerCase();
        const hits: AegisSearchResult[] = candidates
          .filter((c) => c.id.includes(q) || c.label.toLowerCase().includes(q))
          .map((c) => ({
            ref: { kind: 'entity', entityId: c.id },
            kind: 'entity',
            label: c.label,
            source: 'provider',
            score: 0.5,
          }));
        return Promise.resolve(hits);
      },
    }),
    []
  );
  useAegisSearchProvider(deepDatasets);

  const [inspectSurfaceText, setInspectSurfaceText] = useState<string>('(…)');
  const [inspectEntityText, setInspectEntityText] = useState<string>('(…)');
  const [searchText, setSearchText] = useState<string>('(…)');

  // Push selection into the runtime whenever the row picked by the user (or
  // by the agent) changes — keeps `snapshot.selection` in sync.
  useEffect(() => {
    const rt = window.__aegis;
    if (!rt) {
      return;
    }
    rt._setSelection(selectedId ? [{ id: selectedId, type: 'dataset' }] : []);
  }, [selectedId]);

  const columns: Array<DataListColumn<DemoDataset>> = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
  ];

  useEffect(() => {
    const tick = (): void => {
      const rt = window.__aegis;
      if (!rt) {
        setDebug('window.__aegis not found');
        return;
      }
      const payload = {
        actions: rt.listActions().map((a) => a.id),
        snapshot: rt.snapshot(),
      };
      setDebug(JSON.stringify(payload, null, 2));
      setInspectSurfaceText(
        JSON.stringify(
          rt.inspect({ kind: 'surface', surfaceId: 'gallery.demo.datasets' }),
          null,
          2
        )
      );
      setInspectEntityText(
        JSON.stringify(
          rt.inspect({ kind: 'entity', entityId: 'ds-001' }),
          null,
          2
        )
      );
      void rt.search('imagenet').then((hits) => {
        setSearchText(JSON.stringify(hits, null, 2));
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  return (
    <div
      className='gallery__row gallery__row--wide'
      style={{ alignItems: 'flex-start' }}
    >
      <Specimen caption='Button with action prop' span={2}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <AegisButton action={toastAction}>Show toast</AegisButton>
          <DataList
            items={DEMO_DATASETS}
            columns={columns}
            selectedId={selectedId ?? undefined}
            onSelect={setSelectedId}
            surface={{
              id: 'gallery.demo.datasets',
              kind: 'list',
              label: 'Demo datasets',
              project: (rows) => ({
                entities: rows.map((r) => ({
                  id: r.id,
                  type: 'dataset',
                  label: r.name,
                  data: { status: r.status },
                })),
              }),
            }}
          />
          <TextField
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
            }}
            aria-label='agent demo input'
            placeholder='Agent will fill this…'
          />
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-muted)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'var(--space-12)',
              overflow: 'auto',
            }}
          >
            {log.length === 0 ? '(no invocations yet)' : log.join('\n')}
          </pre>
        </div>
      </Specimen>
      <Specimen caption='live snapshot · 1s poll' span={3}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <pre
            aria-label='aegis-debug-snapshot'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-main)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'calc(var(--space-12) * 4)',
              overflow: 'auto',
            }}
          >
            {debug}
          </pre>
          <pre
            aria-label='aegis-inspect-surface'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-main)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'calc(var(--space-12) * 3)',
              overflow: 'auto',
            }}
          >
            {inspectSurfaceText}
          </pre>
          <pre
            aria-label='aegis-inspect-entity'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-main)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'calc(var(--space-12) * 3)',
              overflow: 'auto',
            }}
          >
            {inspectEntityText}
          </pre>
          <pre
            aria-label='aegis-search-imagenet'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-main)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'calc(var(--space-12) * 3)',
              overflow: 'auto',
            }}
          >
            {searchText}
          </pre>
        </div>
      </Specimen>
    </div>
  );
}

interface AskWindow extends Window {
  __aegisOpenAskPanel?: (
    trigger: {
      origin: 'entity' | 'surface' | 'action' | 'global';
      surfaceId?: string;
      entityId?: string;
      actionId?: string;
    },
    anchorEl?: HTMLElement | null
  ) => void;
}

function AskAffordanceSpecimen(): ReactNode {
  const [log, setLog] = useState<string[]>([]);

  const askRows = useMemo(
    () => [
      { id: 'ask-row-1', label: 'imagenet-mini' },
      { id: 'ask-row-2', label: 'wikitext-v3' },
    ],
    []
  );
  const askOptOutRows = useMemo(
    () => [{ id: 'ask-optout-1', label: 'opt-out · ask disabled' }],
    []
  );

  useAegisSurface({
    id: 'gallery.ask.demo',
    kind: 'list',
    label: 'Ask demo',
    askSuggestions: ['Why is this row flagged?', 'Summarise recent changes'],
    data: askRows,
    project: (rows) => ({
      entities: rows.map((r) => ({
        id: r.id,
        type: 'dataset',
        label: r.label,
      })),
    }),
  });

  useEffect(() => {
    const w = window as AskWindow & {
      __aegis?: { onAskTriggered?: (h: (ctx: unknown) => void) => () => void };
    };
    const rt = w.__aegis;
    if (!rt?.onAskTriggered) {
      return;
    }
    return rt.onAskTriggered((ctx) => {
      const c = ctx as { origin: string; entity?: { id?: string } };
      const stamp = new Date().toISOString().slice(11, 19);
      setLog((prev) => [
        ...prev.slice(-9),
        `[${stamp}] askTriggered origin=${c.origin} entity=${c.entity?.id ?? '-'}`,
      ]);
    });
  }, []);

  const onTriggerJs = useCallback(() => {
    const w = window as AskWindow;
    const anchor = document.querySelector<HTMLElement>(
      '[data-ask-demo-row="ask-row-1"]'
    );
    w.__aegisOpenAskPanel?.(
      {
        origin: 'entity',
        surfaceId: 'gallery.ask.demo',
        entityId: 'ask-row-1',
      },
      anchor
    );
  }, []);

  return (
    <div
      className='gallery__row gallery__row--wide'
      style={{ alignItems: 'flex-start' }}
    >
      <Specimen caption='right-click any row · or use Cmd/Ctrl + .' span={3}>
        <div
          data-agent-surface-id='gallery.ask.demo'
          data-aegis-ask-demo-surface=''
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-2)',
          }}
        >
          {askRows.map((row) => (
            <div
              key={row.id}
              data-agent-entity-id={row.id}
              data-ask-demo-row={row.id}
              tabIndex={0}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-13)',
                background: 'var(--bg-muted)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'context-menu',
              }}
            >
              {row.id} · {row.label}
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen caption='ask: false · right-click does NOT open panel' span={2}>
        <div
          data-agent-surface-id='gallery.ask.optout'
          data-agent-ask='off'
          data-aegis-ask-optout-surface=''
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-2)',
          }}
        >
          {askOptOutRows.map((row) => (
            <div
              key={row.id}
              data-agent-entity-id={row.id}
              data-ask-optout-row={row.id}
              tabIndex={0}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-13)',
                background: 'var(--bg-muted)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'context-menu',
              }}
            >
              {row.id} · {row.label}
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen caption='programmatic open · ask event log' span={2}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          <AegisButton onClick={onTriggerJs}>Trigger ask via JS</AegisButton>
          <pre
            aria-label='aegis-ask-event-log'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-11)',
              color: 'var(--text-main)',
              background: 'var(--bg-muted)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              margin: 0,
              maxHeight: 'calc(var(--space-12) * 3)',
              overflow: 'auto',
            }}
          >
            {log.length === 0 ? '(no ask events yet)' : log.join('\n')}
          </pre>
        </div>
      </Specimen>
    </div>
  );
}

export function AgentIntegrationSection() {
  return (
    <Panel
      title={<PanelTitle size='lg'>Agent integration</PanelTitle>}
      extra={<MetricLabel>window.__aegis</MetricLabel>}
    >
      <SectionDivider>Button · action</SectionDivider>
      <AgentIntegrationSpecimen />
      <SectionDivider
        extra={<MetricLabel>Right-click · Cmd/Ctrl + .</MetricLabel>}
      >
        AskOverlay · AskPanel
      </SectionDivider>
      <AskAffordanceSpecimen />
    </Panel>
  );
}
