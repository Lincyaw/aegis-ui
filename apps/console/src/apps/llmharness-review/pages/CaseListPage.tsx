import { type ReactElement, useMemo, useState } from 'react';
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
  SkeletonText,
  TimeDisplay,
  Toolbar,
} from '@lincyaw/aegis-ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { errMsg } from '../../../api/apiClient';
import { llmhKeys } from '../queries';
import {
  BlobCaseRepo,
  type CaseRepo,
  clearStoredRoot,
  HttpCaseRepo,
  isFsAccessSupported,
  pickCasesRoot,
  resolveCaseRepo,
} from '../repo';
import type { CaseSummary } from '../schemas';
import { nsToIso } from '../time';

import './CaseListPage.css';

const NO_CASES: CaseSummary[] = [];

export function CaseListPage(): ReactElement {
  const queryClient = useQueryClient();
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [onlySurfaced, setOnlySurfaced] = useState(false);
  const [datasetFilter, setDatasetFilter] = useState<string | null>(null);

  const source = useQuery<CaseRepo | null>({
    queryKey: llmhKeys.caseSource,
    queryFn: resolveCaseRepo,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  const repo = source.data ?? null;
  const listing = useQuery({
    queryKey: llmhKeys.cases(repo),
    queryFn: () => (repo ? repo.listCases() : NO_CASES),
    enabled: repo !== null,
  });
  const cases = listing.data ?? NO_CASES;

  const setSource = (next: CaseRepo | null): void => {
    queryClient.setQueryData(llmhKeys.caseSource, next);
  };

  const handlePick = async (): Promise<void> => {
    setSourceError(null);
    try {
      setSource(await pickCasesRoot());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setSourceError(errMsg(err));
    }
  };

  const handleClear = async (): Promise<void> => {
    try {
      await clearStoredRoot();
      setSource(null);
    } catch (err) {
      setSourceError(errMsg(err));
    }
  };

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

  if (source.isPending) {
    return (
      <Panel title={<PanelTitle size='lg'>Case review</PanelTitle>}>
        <SkeletonText lines={4} />
      </Panel>
    );
  }

  if (!repo) {
    const error = source.isError ? errMsg(source.error) : sourceError;
    const actions = (
      <div className='llmh-cases__actions'>
        <Link to='settings'>
          <Button>
            <ApiOutlined /> Open Connection settings
          </Button>
        </Link>
        {isFsAccessSupported() ? (
          <Button tone='ghost' onClick={() => void handlePick()}>
            <FolderOpenOutlined /> Pick a local directory
          </Button>
        ) : null}
      </div>
    );
    return (
      <Panel
        title={<PanelTitle size='lg'>Case review</PanelTitle>}
        extra={<MetricLabel>llmharness · case aggregator</MetricLabel>}
      >
        {error !== null ? (
          <ErrorState
            title='Could not open the case source'
            description={error}
            action={actions}
          />
        ) : (
          <EmptyState
            title='Connect to a case source'
            description='Configure a `llmharness serve` URL, point at a path inside platform blob storage, or pick a local cases/ directory (Chromium-based browsers only).'
            action={actions}
          />
        )}
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
          className='llmh-cases__case-link'
        >
          <MonoValue size='sm'>{r.caseId}</MonoValue>
          {r.meta.sample_id && r.meta.sample_id !== r.caseId && (
            <MetricLabel size='xs'>Sample {r.meta.sample_id}</MetricLabel>
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
        const iso = nsToIso(r.meta.started_at_ns);
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
      numeric: true,
      width: 100,
      render: (r) => r.meta.extractor_firings,
    },
    {
      key: 'aud',
      header: 'Auditor',
      numeric: true,
      width: 90,
      render: (r) => r.meta.auditor_firings,
    },
    {
      key: 'surfaced',
      header: 'Surfaced',
      numeric: true,
      width: 100,
      render: (r) =>
        r.meta.surfaced_reminders > 0 ? (
          <Chip tone='warning'>{r.meta.surfaced_reminders}</Chip>
        ) : (
          0
        ),
    },
  ];

  return (
    <Panel
      title={<PanelTitle size='lg'>Cases</PanelTitle>}
      extra={
        <>
          <MetricLabel>
            {sourceLabel}
            {repo.label}
          </MetricLabel>
          <Button tone='ghost' onClick={() => void listing.refetch()}>
            <ReloadOutlined /> Refresh
          </Button>
          {!isRemote && (
            <Button tone='ghost' onClick={() => void handleClear()}>
              Change root
            </Button>
          )}
        </>
      }
    >
      <Toolbar
        searchPlaceholder='case_id / sample_id / dataset_name'
        searchValue={search}
        onSearchChange={setSearch}
        filters={filterChips}
        action={
          <div className='llmh-cases__filters'>
            <Chip
              tone={onlySurfaced ? 'ink' : 'default'}
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
      <div className='llmh-cases__table'>
        {listing.isError ? (
          <ErrorState
            title='Failed to read cases root'
            description={errMsg(listing.error)}
          />
        ) : (
          <DataTable
            framed={false}
            columns={columns}
            data={visibleCases}
            rowKey={(r) => r.caseId}
            loading={listing.isPending}
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
