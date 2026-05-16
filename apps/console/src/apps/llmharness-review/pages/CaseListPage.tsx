import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import {
  ApiOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
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
  BlobCaseRepo,
  type CaseRepo,
  clearStoredRoot,
  HttpCaseRepo,
  isFsAccessSupported,
  pickCasesRoot,
  probeBlobCaseRepo,
  probeHttpCaseRepo,
  restoreCasesRoot,
} from '../repo';
import type { CaseSummary } from '../schemas';

function nsToMs(ns: number): number {
  return Math.round(ns / 1_000_000);
}

function nsToIsoOrNull(ns: number): string | null {
  if (!ns) return null;
  return new Date(nsToMs(ns)).toISOString();
}

export function CaseListPage(): ReactElement {
  const [repo, setRepo] = useState<CaseRepo | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [onlySurfaced, setOnlySurfaced] = useState(false);
  const [datasetFilter, setDatasetFilter] = useState<string | null>(null);

  const refresh = useCallback(async (r: CaseRepo) => {
    setLoading(true);
    setError(null);
    try {
      setCases(await r.listCases());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const http = await probeHttpCaseRepo();
        if (cancelled) {
          return;
        }
        if (http) {
          setRepo(http);
          await refresh(http);
          return;
        }
        const blob = probeBlobCaseRepo();
        if (cancelled) {
          return;
        }
        if (blob) {
          setRepo(blob);
          await refresh(blob);
          return;
        }
        const fs = await restoreCasesRoot();
        if (cancelled) {
          return;
        }
        if (fs) {
          setRepo(fs);
          await refresh(fs);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    })().catch(() => {
      /* swallow — the inner try already handles. */
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

  if (!repo) {
    const fsAction = isFsAccessSupported() ? (
      <Button tone='ghost' onClick={() => void handlePick()}>
        <FolderOpenOutlined /> Pick a local directory
      </Button>
    ) : null;
    return (
      <Panel
        title={<PanelTitle size='lg'>Case review</PanelTitle>}
        extra={<MetricLabel>llmharness · case aggregator</MetricLabel>}
      >
        <EmptyState
          title='Connect to a case source'
          description='Configure a `llmharness serve` URL, point at a path inside platform blob storage, or pick a local cases/ directory (Chromium-based browsers only).'
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to='settings'>
                <Button>
                  <ApiOutlined /> Open Connection settings
                </Button>
              </Link>
              {fsAction}
            </div>
          }
        />
      </Panel>
    );
  }

  const isHttpRemote = repo instanceof HttpCaseRepo;
  const isBlobRemote = repo instanceof BlobCaseRepo;
  const isRemote = isHttpRemote || isBlobRemote;
  const sourceLabel = isHttpRemote
    ? 'remote · '
    : isBlobRemote
      ? 'blob · '
      : '';

  const filterChips: FilterChip[] = [
    ...(onlySurfaced ? [{ key: 'surfaced', label: 'surfaced only' }] : []),
    ...(datasetFilter
      ? [{ key: 'dataset', label: `dataset: ${datasetFilter}` }]
      : []),
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
        return iso ? (
          <TimeDisplay value={iso} />
        ) : (
          <MetricLabel size='xs'>—</MetricLabel>
        );
      },
    },
    {
      key: 'ext',
      header: 'Extractor',
      align: 'right',
      width: 100,
      render: (r) => (
        <MonoValue size='sm'>{r.meta.extractor_firings}</MonoValue>
      ),
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
          <MetricLabel>
            {sourceLabel}
            {repo.label}
          </MetricLabel>
          <Button tone='ghost' onClick={() => void refresh(repo)}>
            <ReloadOutlined /> Refresh
          </Button>
          {!isRemote && (
            <Button tone='ghost' onClick={() => void handleClear()}>
              Change root
            </Button>
          )}
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
