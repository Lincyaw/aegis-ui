import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  EmptyState,
  ErrorState,
  Panel,
  PanelTitle,
  type TabItem,
  Tabs,
} from '@lincyaw/aegis-ui';

import { CaseMetaBar } from '../components';
import { AuditorTab } from '../components/tabs/AuditorTab';
import { EventGraphTab } from '../components/tabs/EventGraphTab';
import { ExtractorTab } from '../components/tabs/ExtractorTab';
import { type FiringEntry } from '../components/tabs/FiringList';
import { type CaseRepo, probeHttpCaseRepo, restoreCasesRoot } from '../repo';
import type {
  CaseMeta,
  FiringFile,
  FiringPhase,
  MainAgentMessage,
  VerdictRow,
} from '../types';

interface LoadedCase {
  meta: CaseMeta;
  messages: MainAgentMessage[];
  extractor: FiringEntry[];
  auditor: FiringEntry[];
  verdicts: VerdictRow[];
}

type TabKey = 'extractor' | 'graph' | 'auditor';

const TAB_ITEMS: TabItem[] = [
  { key: 'extractor', label: 'Extractor' },
  { key: 'graph', label: 'Event Graph' },
  { key: 'auditor', label: 'Auditor' },
];

function parseFiringFileName(
  name: string
): { seq: number; turn: number } | null {
  const m = /^(\d+)_turn_(\d+)\.json$/.exec(name);
  if (!m) {
    return null;
  }
  return { seq: Number(m[1]), turn: Number(m[2]) };
}

async function indexFiles(
  repo: CaseRepo,
  caseId: string,
  phase: FiringPhase,
  files: string[]
): Promise<FiringEntry[]> {
  const parsed = files
    .map((fileName) => {
      const m = parseFiringFileName(fileName);
      return m ? { fileName, sequence: m.seq, turnIndex: m.turn } : null;
    })
    .filter(
      (x): x is { fileName: string; sequence: number; turnIndex: number } =>
        x !== null
    );

  const enriched = await Promise.all(
    parsed.map(async (p) => {
      try {
        const f = await repo.readFiring(caseId, phase, p.fileName);
        return {
          phase,
          fileName: p.fileName,
          sequence: p.sequence,
          turnIndex: p.turnIndex,
          status: f.status,
          latencyMs: f.latency_ms,
        };
      } catch {
        return {
          phase,
          fileName: p.fileName,
          sequence: p.sequence,
          turnIndex: p.turnIndex,
          status: 'spawn_error' as const,
          latencyMs: 0,
        };
      }
    })
  );
  return enriched.sort((a, b) => a.sequence - b.sequence);
}

function readTabParam(value: string | null): TabKey {
  if (value === 'graph' || value === 'auditor') {
    return value;
  }
  return 'extractor';
}

function readSeqParam(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function CaseDetailPage(): ReactElement {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId ? decodeURIComponent(params.caseId) : '';

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTabParam(searchParams.get('tab'));
  const firingParam = readSeqParam(searchParams.get('firing'));
  const snapshotParam = readSeqParam(searchParams.get('snapshot'));

  const [repo, setRepo] = useState<CaseRepo | null>(null);
  const [data, setData] = useState<LoadedCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firing, setFiring] = useState<FiringFile | null>(null);
  const [firingError, setFiringError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async (): Promise<CaseRepo | null> => {
      const http = await probeHttpCaseRepo();
      if (http) {
        return http;
      }
      return restoreCasesRoot();
    })()
      .then(async (r) => {
        if (cancelled) {
          return;
        }
        if (!r) {
          setError(
            'No backend connected. Configure a `llmharness serve` URL in Connection settings, or open a local cases root from the Cases list first.'
          );
          return;
        }
        setRepo(r);
        const [meta, messages, extractorFiles, auditorFiles, verdicts] =
          await Promise.all([
            r.readMeta(caseId),
            r.readMainAgent(caseId),
            r.listFiringFiles(caseId, 'extractor'),
            r.listFiringFiles(caseId, 'auditor'),
            r.readVerdicts(caseId),
          ]);
        const [extractor, auditor] = await Promise.all([
          indexFiles(r, caseId, 'extractor', extractorFiles),
          indexFiles(r, caseId, 'auditor', auditorFiles),
        ]);
        if (cancelled) {
          return;
        }
        setData({ meta, messages, extractor, auditor, verdicts });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const activeFiringSeq = useMemo<number | null>(() => {
    if (!data) {
      return null;
    }
    if (tab === 'extractor') {
      return firingParam ?? data.extractor[0]?.sequence ?? null;
    }
    if (tab === 'auditor') {
      return firingParam ?? data.auditor[0]?.sequence ?? null;
    }
    return null;
  }, [tab, firingParam, data]);

  const activeSnapshotSeq = useMemo<number | null>(() => {
    if (!data || tab !== 'graph') {
      return null;
    }
    const okExtractors = data.extractor.filter((f) => f.status === 'ok');
    if (okExtractors.length === 0) {
      return null;
    }
    if (
      snapshotParam !== null &&
      okExtractors.some((f) => f.sequence === snapshotParam)
    ) {
      return snapshotParam;
    }
    return okExtractors[okExtractors.length - 1].sequence;
  }, [tab, snapshotParam, data]);

  useEffect(() => {
    if (!repo || !data || activeFiringSeq === null) {
      setFiring(null);
      setFiringError(null);
      return;
    }
    const phase: FiringPhase = tab === 'auditor' ? 'auditor' : 'extractor';
    if (tab !== 'extractor' && tab !== 'auditor') {
      return;
    }
    const list = phase === 'extractor' ? data.extractor : data.auditor;
    const entry = list.find((f) => f.sequence === activeFiringSeq);
    if (!entry) {
      setFiring(null);
      return;
    }
    let cancelled = false;
    setFiringError(null);
    repo
      .readFiring(caseId, phase, entry.fileName)
      .then((f) => {
        if (!cancelled) {
          setFiring(f);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFiringError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repo, data, caseId, tab, activeFiringSeq]);

  useEffect(() => {
    setSelectedEventId(null);
  }, [tab, activeFiringSeq]);

  const handleTabChange = (key: string): void => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    next.delete('firing');
    next.delete('snapshot');
    setSearchParams(next, { replace: true });
  };

  const handleSelectFiring = (sequence: number): void => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.set('firing', String(sequence));
    setSearchParams(next, { replace: true });
  };

  const handleSelectSnapshot = (sequence: number): void => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'graph');
    next.set('snapshot', String(sequence));
    setSearchParams(next, { replace: true });
  };

  if (error) {
    return (
      <Panel title={<PanelTitle size='lg'>Case</PanelTitle>}>
        <ErrorState title='Failed to load case' description={error} />
      </Panel>
    );
  }
  if (!data) {
    return (
      <Panel title={<PanelTitle size='lg'>Case</PanelTitle>}>
        <EmptyState title='Loading…' />
      </Panel>
    );
  }

  const header = (
    <PanelTitle size='lg'>
      <Link to='..' style={{ color: 'inherit', textDecoration: 'none' }}>
        ← Cases
      </Link>
    </PanelTitle>
  );

  return (
    <Panel title={header} extra={<CaseMetaBar meta={data.meta} />}>
      <Tabs items={TAB_ITEMS} activeKey={tab} onChange={handleTabChange}>
        {tab === 'extractor' && (
          <ExtractorTab
            repo={repo}
            caseId={caseId}
            firings={data.extractor}
            selectedSequence={activeFiringSeq}
            onSelectSequence={handleSelectFiring}
            firing={firing && firing.phase === 'extractor' ? firing : null}
            firingError={firingError}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
          />
        )}
        {tab === 'graph' && (
          <EventGraphTab
            repo={repo}
            caseId={caseId}
            extractorFirings={data.extractor}
            selectedStep={activeSnapshotSeq}
            onSelectStep={handleSelectSnapshot}
          />
        )}
        {tab === 'auditor' && (
          <AuditorTab
            repo={repo}
            caseId={caseId}
            auditorFirings={data.auditor}
            extractorFirings={data.extractor}
            verdicts={data.verdicts}
            selectedSequence={activeFiringSeq}
            onSelectSequence={handleSelectFiring}
            firing={firing && firing.phase === 'auditor' ? firing : null}
            firingError={firingError}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
          />
        )}
      </Tabs>
    </Panel>
  );
}

export default CaseDetailPage;
