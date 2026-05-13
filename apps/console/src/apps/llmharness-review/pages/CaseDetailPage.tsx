import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  EmptyState,
  ErrorState,
  Panel,
  PanelTitle,
  SectionDivider,
} from '@lincyaw/aegis-ui';

import {
  CaseDetailLayout,
  CaseMetaBar,
  type FiringEntry,
  FiringDetail,
  FiringsPane,
  TrajectoryPane,
  type TurnMarkerFiring,
  VerdictsPane,
} from '../components';
import { type FSAccessCaseRepo, restoreCasesRoot } from '../repo';
import type {
  CaseMeta,
  FiringFile,
  FiringPhase,
  GraphSnapshotFile,
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

interface Selection {
  phase: FiringPhase;
  sequence: number;
}

function parseFiringFileName(name: string): { seq: number; turn: number } | null {
  const m = name.match(/^(\d+)_turn_(\d+)\.json$/);
  if (!m) return null;
  return { seq: Number(m[1]), turn: Number(m[2]) };
}

async function indexFiles(
  repo: FSAccessCaseRepo,
  caseId: string,
  phase: FiringPhase,
  files: string[],
): Promise<FiringEntry[]> {
  const parsed = files
    .map((fileName) => {
      const m = parseFiringFileName(fileName);
      return m ? { fileName, sequence: m.seq, turnIndex: m.turn } : null;
    })
    .filter((x): x is { fileName: string; sequence: number; turnIndex: number } => x !== null);

  // Light preload of every firing JSON so the list can show real status +
  // latency. Cases are small (~tens of firings); parallel reads are cheap.
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
    }),
  );
  return enriched.sort((a, b) => a.sequence - b.sequence);
}

export function CaseDetailPage(): ReactElement {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId ? decodeURIComponent(params.caseId) : '';

  const [repo, setRepo] = useState<FSAccessCaseRepo | null>(null);
  const [data, setData] = useState<LoadedCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Selection | null>(null);
  const [firing, setFiring] = useState<FiringFile | null>(null);
  const [firingError, setFiringError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [scrollToTurn, setScrollToTurn] = useState<number | null>(null);
  // Counter forces useEffect re-run when the user re-clicks the same turn.
  const [scrollTick, setScrollTick] = useState(0);

  const handleJumpToTurn = (turnIndex: number) => {
    setScrollToTurn(turnIndex);
    setScrollTick((n) => n + 1);
  };

  useEffect(() => {
    let cancelled = false;
    setError(null);
    restoreCasesRoot()
      .then(async (r) => {
        if (cancelled) return;
        if (!r) {
          setError('No cases root selected. Open one from the Cases list first.');
          return;
        }
        setRepo(r);
        const [meta, messages, extractorFiles, auditorFiles, verdicts] = await Promise.all([
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
        if (cancelled) return;
        setData({
          meta,
          messages,
          extractor,
          auditor,
          verdicts,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    if (!repo || !selected || !data) {
      setFiring(null);
      setFiringError(null);
      return;
    }
    const idx =
      selected.phase === 'extractor'
        ? data.extractor.find((e) => e.sequence === selected.sequence)
        : data.auditor.find((e) => e.sequence === selected.sequence);
    if (!idx) return;
    let cancelled = false;
    setFiringError(null);
    repo
      .readFiring(caseId, selected.phase, idx.fileName)
      .then((f) => {
        if (!cancelled) setFiring(f);
      })
      .catch((err: unknown) => {
        if (!cancelled) setFiringError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [repo, selected, data, caseId]);

  const mergedFirings: FiringEntry[] = useMemo(() => {
    if (!data) return [];
    return [...data.extractor, ...data.auditor].sort((a, b) => {
      if (a.turnIndex !== b.turnIndex) return a.turnIndex - b.turnIndex;
      if (a.phase !== b.phase) return a.phase === 'extractor' ? -1 : 1;
      return a.sequence - b.sequence;
    });
  }, [data]);

  const firingsByTurn: Map<number, TurnMarkerFiring[]> = useMemo(() => {
    const out = new Map<number, TurnMarkerFiring[]>();
    if (!data) return out;
    for (const f of mergedFirings) {
      const surfaced =
        f.phase === 'auditor' &&
        Boolean(data.verdicts.find((v) => v.sequence === f.sequence)?.surface_reminder);
      const arr = out.get(f.turnIndex) ?? [];
      arr.push({ phase: f.phase, sequence: f.sequence, surfaced });
      out.set(f.turnIndex, arr);
    }
    return out;
  }, [mergedFirings, data]);

  const handleSelectFiring = (phase: FiringPhase, sequence: number) => {
    setSelected({ phase, sequence });
    setSelectedEventId(null);
  };

  // Snapshot loading for the extractor "After" tab. Keyed by sequence;
  // `undefined` ⇒ not yet requested, `null` ⇒ loading, `value` ⇒ done.
  const [snapshot, setSnapshot] = useState<GraphSnapshotFile | null | undefined>(undefined);

  useEffect(() => {
    if (!repo || !selected) {
      setSnapshot(undefined);
      return;
    }
    if (selected.phase !== 'extractor') {
      setSnapshot(undefined);
      return;
    }
    let cancelled = false;
    setSnapshot(null);
    repo
      .readSnapshot(caseId, selected.sequence)
      .then((s) => {
        if (!cancelled) setSnapshot(s ?? undefined);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [repo, selected, caseId]);

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
    <>
      <PanelTitle size='lg'>
        <Link to='..' style={{ color: 'inherit', textDecoration: 'none' }}>
          ← Cases
        </Link>
      </PanelTitle>
      <CaseMetaBar meta={data.meta} />
    </>
  );

  const left = (
    <>
      <SectionDivider>Trajectory</SectionDivider>
      <TrajectoryPane
        messages={data.messages}
        firingsByTurn={firingsByTurn}
        selectedFiring={selected}
        onSelectFiring={handleSelectFiring}
        scrollToTurn={scrollToTurn}
        scrollSignal={scrollTick}
      />
    </>
  );

  const right = (
    <>
      <SectionDivider>Firings</SectionDivider>
      <FiringsPane
        firings={mergedFirings}
        verdicts={data.verdicts}
        selected={selected}
        onSelect={handleSelectFiring}
        onJumpToTurn={handleJumpToTurn}
      />

      <SectionDivider>Firing detail</SectionDivider>
      {!selected && (
        <EmptyState title='No firing selected' description='Pick a card above or a turn marker.' />
      )}
      {firingError && <ErrorState title='Failed to load firing' description={firingError} />}
      {firing && (
        <FiringDetail
          firing={firing}
          selectedEventId={selectedEventId}
          onSelectEvent={(id) => setSelectedEventId(id)}
          onSelectTurn={handleJumpToTurn}
          snapshot={firing.phase === 'extractor' ? snapshot : undefined}
        />
      )}

      {data.verdicts.length > 0 && (
        <>
          <SectionDivider>Verdicts</SectionDivider>
          <VerdictsPane
            verdicts={data.verdicts}
            selected={selected}
            onSelect={(phase, seq) => handleSelectFiring(phase, seq)}
          />
        </>
      )}
    </>
  );

  return (
    <Panel title={<PanelTitle size='lg'>Case</PanelTitle>}>
      <CaseDetailLayout header={header} left={left} right={right} />
    </Panel>
  );
}

export default CaseDetailPage;
