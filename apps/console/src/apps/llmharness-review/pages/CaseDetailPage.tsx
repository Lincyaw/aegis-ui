import {
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  Chip,
  EmptyState,
  ErrorState,
  MetricLabel,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';

import { CaseMetaBar, MessageBlocks, SftRowDetail } from '../components';
import {
  type CaseRepo,
  type CaseSftBundle,
  probeBlobCaseRepo,
  probeHttpCaseRepo,
  restoreCasesRoot,
} from '../repo';
import type { CaseBundle, SftRow } from '../schemas';
import { CaseSelectionProvider } from '../CaseSelection';
import { useCaseSelection } from '../selection';

import { FiringsTimeline } from './FiringsTimeline';
import { ExtractorInspector } from './inspectors/ExtractorInspector';
import { AuditorInspector } from './inspectors/AuditorInspector';

import './CaseDetailPage.css';

// --- Main column (chat) -------------------------------------------------

interface MainColumnProps {
  bundle: CaseBundle;
}

function MainColumn({ bundle }: MainColumnProps): ReactElement {
  const { selection, set } = useCaseSelection();
  const containerRef = useRef<HTMLDivElement>(null);

  // Highlight every turn cited by the currently selected event.
  const citedTurns = useMemo<Set<number>>(() => {
    if (selection.eventId === null) {
      return new Set();
    }
    for (const f of bundle.extractor) {
      const ev = f.output?.events.find((e) => e.id === selection.eventId);
      if (ev) {
        return new Set(ev.source_turns);
      }
    }
    return new Set();
  }, [selection.eventId, bundle.extractor]);

  // Highlight the input window of the currently selected firing.
  const firingWindow = useMemo<Set<number>>(() => {
    if (selection.mode === 'extractor' && selection.extractorSeq !== null) {
      const f = bundle.extractor.find(
        (x) => x.sequence === selection.extractorSeq,
      );
      if (f) {
        return new Set(f.input.payload.new_turns.map((t) => t.index));
      }
    }
    if (selection.mode === 'auditor' && selection.auditorSeq !== null) {
      const f = bundle.auditor.find((x) => x.sequence === selection.auditorSeq);
      if (f) {
        return new Set([f.turn_index - 1]);
      }
    }
    return new Set();
  }, [
    selection.mode,
    selection.extractorSeq,
    selection.auditorSeq,
    bundle.extractor,
    bundle.auditor,
  ]);

  // Auto-scroll Main when selection.turn changes (chip click on a gutter
  // or a Timeline chip writing turn). Don't scroll on every event-id pick
  // — that would jitter the list while the user is comparing.
  useEffect(() => {
    if (selection.turn === null) {
      return;
    }
    const el = containerRef.current?.querySelector(
      `[data-turn="${selection.turn.toString()}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [selection.turn]);

  const reminderForTurn = useMemo<Map<number, number>>(() => {
    const m = new Map<number, number>();
    for (const [auditorSeq, turnIndex] of bundle.links.reminderInjection) {
      m.set(turnIndex, auditorSeq);
    }
    return m;
  }, [bundle.links.reminderInjection]);

  return (
    <div className='llmh-cdp__main' ref={containerRef}>
      {bundle.main.map((turn) => {
        const idx = turn.index;
        const ext = bundle.links.turnToExtractor.get(idx) ?? [];
        const aud = bundle.links.turnToAuditor.get(idx) ?? [];
        const reminderFrom = reminderForTurn.get(idx);
        const selected = selection.turn === idx;
        const cited = citedTurns.has(idx);
        const inWindow = firingWindow.has(idx);
        const cls = [
          'llmh-cdp__main-row',
          `llmh-cdp__main-row--${turn.role}`,
          selected ? 'llmh-cdp__main-row--selected' : '',
          cited ? 'llmh-cdp__main-row--cited' : '',
          inWindow ? 'llmh-cdp__main-row--window' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={idx}
            data-turn={idx}
            className={cls}
            role='button'
            tabIndex={0}
            onClick={() => {
              set({ turn: idx });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                set({ turn: idx });
              }
            }}
          >
            <div className='llmh-cdp__main-meta'>
              <span className='llmh-cdp__main-meta-idx'>#{idx}</span>
              <span className='llmh-cdp__main-meta-role'>{turn.role}</span>
              {reminderFrom !== undefined && (
                <button
                  type='button'
                  className='llmh-cdp__reminder'
                  onClick={(e) => {
                    e.stopPropagation();
                    set({ mode: 'auditor', auditorSeq: reminderFrom });
                  }}
                >
                  ★ REMINDER (A#{reminderFrom})
                </button>
              )}
              <div className='llmh-cdp__main-gutter'>
                {ext.map((s) => (
                  <span
                    key={`e${s.toString()}`}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                    }}
                    role='presentation'
                  >
                    <Chip
                      tone={
                        selection.mode === 'extractor' &&
                        selection.extractorSeq === s
                          ? 'ink'
                          : 'default'
                      }
                      onClick={() => {
                        set({
                          mode: 'extractor',
                          extractorSeq: s,
                          auditorSeq: null,
                        });
                      }}
                    >
                      E#{s}
                    </Chip>
                  </span>
                ))}
                {aud.map((s) => (
                  <span
                    key={`a${s.toString()}`}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                    }}
                    role='presentation'
                  >
                    <Chip
                      tone={
                        selection.mode === 'auditor' &&
                        selection.auditorSeq === s
                          ? 'ink'
                          : 'warning'
                      }
                      onClick={() => {
                        set({
                          mode: 'auditor',
                          auditorSeq: s,
                          extractorSeq: null,
                        });
                      }}
                    >
                      A#{s}
                    </Chip>
                  </span>
                ))}
              </div>
            </div>
            <MessageBlocks turn={turn} />
          </div>
        );
      })}
    </div>
  );
}

// --- Inspector pane ------------------------------------------------------

function InspectorPane({ bundle }: { bundle: CaseBundle }): ReactElement {
  const { selection } = useCaseSelection();

  if (selection.mode === 'extractor' && selection.extractorSeq !== null) {
    const firing = bundle.extractor.find(
      (f) => f.sequence === selection.extractorSeq,
    );
    if (firing) {
      return <ExtractorInspector firing={firing} bundle={bundle} />;
    }
  }
  if (selection.mode === 'auditor' && selection.auditorSeq !== null) {
    const firing = bundle.auditor.find(
      (f) => f.sequence === selection.auditorSeq,
    );
    if (firing) {
      return <AuditorInspector firing={firing} bundle={bundle} />;
    }
  }
  return (
    <EmptyState
      title='Pick a firing'
      description='Click E#n or A#n in the timeline above to inspect that firing.'
    />
  );
}

// --- SFT drawer ----------------------------------------------------------

type SftLoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; sft: CaseSftBundle }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string };

interface SftDrawerProps {
  repo: CaseRepo;
  caseId: string;
  rootSessionId: string;
}

function SftDrawer({
  repo,
  caseId,
  rootSessionId,
}: SftDrawerProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'extractor' | 'auditor' | 'dropped'>(
    'extractor',
  );
  const [selected, setSelected] = useState<SftRow | null>(null);
  const [load, setLoad] = useState<SftLoadState>({ kind: 'idle' });

  useEffect(() => {
    if (!open || load.kind !== 'idle') {
      return undefined;
    }
    let cancelled = false;
    setLoad({ kind: 'loading' });
    repo
      .loadSftForCase(caseId, rootSessionId)
      .then((res) => {
        if (cancelled) {
          return;
        }
        if (!res) {
          setLoad({ kind: 'unavailable' });
        } else {
          setLoad({ kind: 'loaded', sft: res });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoad({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, load.kind, repo, caseId, rootSessionId]);

  const sft = load.kind === 'loaded' ? load.sft : null;

  const counts =
    sft !== null
      ? `${sft.extractor.length.toString()} ext · ${sft.auditor.length.toString()} aud · ${sft.dropped.length.toString()} dropped`
      : '—';

  const rows: SftRow[] = useMemo(() => {
    if (!sft) {
      return [];
    }
    if (tab === 'auditor') {
      return sft.auditor;
    }
    if (tab === 'extractor') {
      return sft.extractor;
    }
    return [];
  }, [sft, tab]);

  return (
    <div className='llmh-cdp__sft'>
      <button
        type='button'
        className='llmh-cdp__sft-head'
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <span>{open ? '▼' : '▶'} SFT export</span>
        <MetricLabel size='xs'>{counts}</MetricLabel>
      </button>
      {open && (
        <div className='llmh-cdp__sft-body'>
          {load.kind === 'loading' ? (
            <EmptyState title='Loading SFT…' />
          ) : load.kind === 'unavailable' ? (
            <EmptyState
              title='SFT not available'
              description='No sft/ directory or endpoint found for this case.'
            />
          ) : load.kind === 'error' ? (
            <ErrorState title='Failed to load SFT' description={load.message} />
          ) : !sft ? (
            <EmptyState title='SFT not available' />
          ) : (
            <>
              <div className='llmh-cdp__sft-tabs'>
                <Chip
                  tone={tab === 'extractor' ? 'ink' : 'default'}
                  onClick={() => {
                    setTab('extractor');
                    setSelected(null);
                  }}
                >
                  extractor ({sft.extractor.length})
                </Chip>
                <Chip
                  tone={tab === 'auditor' ? 'ink' : 'default'}
                  onClick={() => {
                    setTab('auditor');
                    setSelected(null);
                  }}
                >
                  auditor ({sft.auditor.length})
                </Chip>
                <Chip
                  tone={tab === 'dropped' ? 'ink' : 'default'}
                  onClick={() => {
                    setTab('dropped');
                    setSelected(null);
                  }}
                >
                  dropped ({sft.dropped.length})
                </Chip>
              </div>
              {tab === 'dropped' ? (
                <pre className='llmh-cdp__pre'>
                  {JSON.stringify(sft.dropped, null, 2)}
                </pre>
              ) : (
                <div className='llmh-cdp__sft-rows'>
                  <div className='llmh-cdp__sft-list'>
                    {rows.map((r) => (
                      <button
                        key={`${r.root_session_id}#${r.turn_index.toString()}#${r.sequence?.toString() ?? ''}`}
                        type='button'
                        className='llmh-cdp__sft-row-btn'
                        onClick={() => {
                          setSelected(r);
                        }}
                      >
                        turn {r.turn_index}
                        {r.sequence !== undefined && (
                          <MetricLabel size='xs'>
                            seq {r.sequence}
                          </MetricLabel>
                        )}
                      </button>
                    ))}
                  </div>
                  <div>
                    {selected ? (
                      <SftRowDetail row={selected} />
                    ) : (
                      <EmptyState title='Pick a row' />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Page root -----------------------------------------------------------

interface LoadedCase {
  repo: CaseRepo;
  caseId: string;
  bundle: CaseBundle;
}

function CaseDetailBody({ data }: { data: LoadedCase }): ReactElement {
  const { selection, set } = useCaseSelection();

  // Default to the first extractor firing on first paint so the inspector
  // is never empty.
  useEffect(() => {
    if (selection.mode !== null) {
      return;
    }
    const first = data.bundle.extractor[0];
    if (first) {
      set({
        mode: 'extractor',
        extractorSeq: first.sequence,
      });
    } else {
      const firstAud = data.bundle.auditor[0];
      if (firstAud) {
        set({ mode: 'auditor', auditorSeq: firstAud.sequence });
      }
    }
    // We want this exactly once per case load. Deps would re-fire on
    // every selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.caseId]);

  return (
    <div className='llmh-cdp'>
      <FiringsTimeline bundle={data.bundle} />
      <div className='llmh-cdp__split'>
        <div className='llmh-cdp__col llmh-cdp__col--main'>
          <header className='llmh-cdp__col-head'>
            Main agent
            <MetricLabel size='xs'>
              {data.bundle.main.length} turns
            </MetricLabel>
          </header>
          <MainColumn bundle={data.bundle} />
        </div>
        <div className='llmh-cdp__col llmh-cdp__col--insp'>
          <header className='llmh-cdp__col-head'>
            Inspector
            <MetricLabel size='xs'>
              {selection.mode
                ? `${selection.mode} · ${
                    selection.mode === 'extractor'
                      ? `E#${selection.extractorSeq?.toString() ?? '?'}`
                      : `A#${selection.auditorSeq?.toString() ?? '?'}`
                  }`
                : 'idle'}
            </MetricLabel>
          </header>
          <div className='llmh-cdp__insp-body'>
            <InspectorPane bundle={data.bundle} />
          </div>
        </div>
      </div>
      <SftDrawer
        repo={data.repo}
        caseId={data.caseId}
        rootSessionId={data.bundle.meta.root_session_id}
      />
    </div>
  );
}

export function CaseDetailPage(): ReactElement {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId ? decodeURIComponent(params.caseId) : '';

  const [data, setData] = useState<LoadedCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setData(null);
    (async (): Promise<CaseRepo | null> => {
      const http = await probeHttpCaseRepo();
      if (http) {
        return http;
      }
      const blob = probeBlobCaseRepo();
      if (blob) {
        return blob;
      }
      return restoreCasesRoot();
    })()
      .then(async (repo) => {
        if (cancelled) {
          return;
        }
        if (!repo) {
          setError(
            'No backend connected. Configure a `llmharness serve` URL, a blob root (bucket + prefix), or open a local cases root from the Cases list first.',
          );
          return;
        }
        const bundle = await repo.loadBundle(caseId);
        if (cancelled) {
          return;
        }
        setData({ repo, caseId, bundle });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const header = (
    <PanelTitle size='lg'>
      <Link to='..' style={{ color: 'inherit', textDecoration: 'none' }}>
        ← Cases
      </Link>
    </PanelTitle>
  );

  if (error) {
    return (
      <Panel title={header}>
        <ErrorState title='Failed to load case' description={error} />
      </Panel>
    );
  }
  if (!data) {
    return (
      <Panel title={header}>
        <EmptyState title='Loading…' />
      </Panel>
    );
  }

  return (
    <Panel title={header} extra={<CaseMetaBar meta={data.bundle.meta} />}>
      <CaseSelectionProvider links={data.bundle.links}>
        <CaseDetailBody data={data} />
      </CaseSelectionProvider>
    </Panel>
  );
}

export default CaseDetailPage;
