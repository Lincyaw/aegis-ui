import { FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons';
import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Button,
  Chip,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  type FilterChip,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  TimeDisplay,
  Toolbar,
} from '@lincyaw/aegis-ui';

import {
  type FSAccessCaseRepo,
  clearStoredRoot,
  isFsAccessSupported,
  pickCasesRoot,
  restoreCasesRoot,
} from '../repo';
import type { CaseSummary } from '../types';

function nsToMs(ns: number): number {
  return Math.round(ns / 1_000_000);
}

function nsToIsoOrNull(ns: number): string | null {
  if (!ns) return null;
  return new Date(nsToMs(ns)).toISOString();
}

export function CaseListPage(): ReactElement {
  const [repo, setRepo] = useState<FSAccessCaseRepo | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [onlySurfaced, setOnlySurfaced] = useState(false);
  const [datasetFilter, setDatasetFilter] = useState<string | null>(null);

  const refresh = useCallback(
    async (r: FSAccessCaseRepo) => {
      setLoading(true);
      setError(null);
      try {
        setCases(await r.listCases());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    restoreCasesRoot()
      .then((r) => {
        if (cancelled) return;
        if (r) {
          setRepo(r);
          void refresh(r);
        } else {
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const handlePick = useCallback(async () => {
    setError(null);
    try {
      const r = await pickCasesRoot();
      setRepo(r);
      await refresh(r);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [refresh]);

  const handleClear = useCallback(async () => {
    await clearStoredRoot();
    setRepo(null);
    setCases([]);
  }, []);

  const datasetOptions = useMemo(() => {
    const names = new Set<string>();
    for (const c of cases) {
      if (c.meta.dataset_name) names.add(c.meta.dataset_name);
    }
    return [...names].sort();
  }, [cases]);

  const visibleCases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (onlySurfaced && c.meta.surfaced_reminders === 0) return false;
      if (datasetFilter && c.meta.dataset_name !== datasetFilter) return false;
      if (q) {
        const hay = [
          c.caseId,
          c.meta.sample_id ?? '',
          c.meta.dataset_name ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cases, search, onlySurfaced, datasetFilter]);

  if (!isFsAccessSupported()) {
    return (
      <Panel title={<PanelTitle size='lg'>Case review</PanelTitle>}>
        <ErrorState
          title='Browser not supported'
          description='This viewer needs the File System Access API. Use a Chromium-based browser (Chrome, Edge, or Brave).'
        />
      </Panel>
    );
  }

  if (!repo) {
    return (
      <Panel
        title={<PanelTitle size='lg'>Case review</PanelTitle>}
        extra={<MetricLabel>llmharness · case aggregator</MetricLabel>}
      >
        <EmptyState
          title='Pick a cases root directory'
          description='Choose the directory that llmharness-aggregate wrote to (the parent of each `<case_id>/` folder).'
          action={
            <Button onClick={handlePick}>
              <FolderOpenOutlined /> Open directory
            </Button>
          }
        />
      </Panel>
    );
  }

  const filterChips: FilterChip[] = [
    ...(onlySurfaced ? [{ key: 'surfaced', label: 'surfaced only' }] : []),
    ...(datasetFilter ? [{ key: 'dataset', label: `dataset: ${datasetFilter}` }] : []),
  ];

  const columns: Array<DataTableColumn<CaseSummary>> = [
    {
      key: 'case',
      header: 'Case',
      width: 280,
      render: (r) => (
        <Link
          to={encodeURIComponent(r.caseId)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          <MonoValue size='sm'>{r.caseId}</MonoValue>
          {r.meta.sample_id && r.meta.sample_id !== r.caseId && (
            <MetricLabel size='xs'>sample {r.meta.sample_id}</MetricLabel>
          )}
        </Link>
      ),
      truncate: false,
    },
    {
      key: 'dataset',
      header: 'Dataset',
      render: (r) =>
        r.meta.dataset_name ? (
          <MonoValue size='sm'>{r.meta.dataset_name}</MonoValue>
        ) : (
          <MetricLabel size='xs'>—</MetricLabel>
        ),
    },
    {
      key: 'started',
      header: 'Started',
      width: 180,
      render: (r) => {
        const iso = nsToIsoOrNull(r.meta.started_at_ns);
        return iso ? <TimeDisplay value={iso} /> : <MetricLabel size='xs'>—</MetricLabel>;
      },
    },
    {
      key: 'ext',
      header: 'Extractor',
      align: 'right',
      width: 100,
      render: (r) => <MonoValue size='sm'>{r.meta.extractor_firings}</MonoValue>,
    },
    {
      key: 'aud',
      header: 'Auditor',
      align: 'right',
      width: 90,
      render: (r) => <MonoValue size='sm'>{r.meta.auditor_firings}</MonoValue>,
    },
    {
      key: 'surfaced',
      header: 'Surfaced',
      align: 'right',
      width: 100,
      render: (r) =>
        r.meta.surfaced_reminders > 0 ? (
          <Chip tone='warning'>{r.meta.surfaced_reminders}</Chip>
        ) : (
          <MonoValue size='sm'>0</MonoValue>
        ),
    },
  ];

  return (
    <Panel
      title={<PanelTitle size='lg'>Cases</PanelTitle>}
      extra={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <MetricLabel>{repo.label}</MetricLabel>
          <Button tone='ghost' onClick={() => void refresh(repo)}>
            <ReloadOutlined /> Refresh
          </Button>
          <Button tone='ghost' onClick={() => void handleClear()}>
            Change root
          </Button>
        </div>
      }
    >
      <Toolbar
        searchPlaceholder='case_id / sample_id / dataset_name'
        searchValue={search}
        onSearchChange={setSearch}
        filters={filterChips}
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip
              tone={onlySurfaced ? 'warning' : 'default'}
              onClick={() => setOnlySurfaced((v) => !v)}
            >
              surfaced only
            </Chip>
            {datasetOptions.map((name) => (
              <Chip
                key={name}
                tone={datasetFilter === name ? 'ink' : 'default'}
                onClick={() =>
                  setDatasetFilter((cur) => (cur === name ? null : name))
                }
              >
                {name}
              </Chip>
            ))}
          </div>
        }
      />
      <div style={{ marginTop: 16 }}>
        {error ? (
          <ErrorState title='Failed to read cases root' description={error} />
        ) : (
          <DataTable
            columns={columns}
            data={visibleCases}
            rowKey={(r) => r.caseId}
            loading={loading}
            emptyTitle='No cases match'
            emptyDescription='Clear the search / filters or pick a different cases root.'
            persistKey='llmharness.cases'
          />
        )}
      </div>
    </Panel>
  );
}

export default CaseListPage;
