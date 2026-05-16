import {
  type ReactElement,
  type ReactNode,
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
  MonoValue,
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
import type {
  AuditorFiring,
  CaseBundle,
  ExtractorEvent,
  ExtractorFiring,
  Finding,
  SftRow,
} from '../schemas';
import { CaseSelectionProvider } from '../CaseSelection';
import { useCaseSelection } from '../selection';

import './CaseDetailPage.css';

// --- Header --------------------------------------------------------------

function FiringStatusChip({
  status,
}: {
  status: ExtractorFiring['status'] | AuditorFiring['status'];
}): ReactElement {
  const tone = status === 'ok' ? 'ghost' : 'warning';
  return <Chip tone={tone}>{status}</Chip>;
}

// --- Main column ---------------------------------------------------------

interface MainColumnProps {
  bundle: CaseBundle;
}

function MainColumn({ bundle }: MainColumnProps): ReactElement {
  const { selection, set } = useCaseSelection();
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (selection.turn === null) {
      return;
    }
    const el = containerRef.current?.querySelector(
      `[data-turn="${selection.turn}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
    <div className='llmh-cdp__col-body' ref={containerRef}>
      {bundle.main.map((turn) => {
        const idx = turn.index;
        const ext = bundle.links.turnToExtractor.get(idx) ?? [];
        const aud = bundle.links.turnToAuditor.get(idx) ?? [];
        const reminderFrom = reminderForTurn.get(idx);
        const selected = selection.turn === idx;
        const cited = citedTurns.has(idx);
        const cls = [
          'llmh-cdp__main-row',
          selected ? 'llmh-cdp__main-row--selected' : '',
          cited ? 'llmh-cdp__main-row--cited' : '',
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
            <div>
              <div className='llmh-cdp__main-meta'>
                <span>#{idx}</span>
                <span>{turn.role}</span>
                {reminderFrom !== undefined && (
                  <button
                    type='button'
                    className='llmh-cdp__reminder'
                    onClick={(e) => {
                      e.stopPropagation();
                      set({ auditorSeq: reminderFrom });
                    }}
                  >
                    ★ REMINDER (A#{reminderFrom})
                  </button>
                )}
              </div>
              <MessageBlocks content={turn.content} />
            </div>
            <div className='llmh-cdp__main-gutter'>
              {ext.map((s) => (
                <span
                  key={`e${s}`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  role='presentation'
                >
                  <Chip
                    tone={selection.extractorSeq === s ? 'ink' : 'default'}
                    onClick={() => {
                      set({ extractorSeq: s });
                    }}
                  >
                    E#{s}
                  </Chip>
                </span>
              ))}
              {aud.map((s) => (
                <span
                  key={`a${s}`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  role='presentation'
                >
                  <Chip
                    tone={selection.auditorSeq === s ? 'ink' : 'default'}
                    onClick={() => {
                      set({ auditorSeq: s });
                    }}
                  >
                    A#{s}
                  </Chip>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Extractor column ---------------------------------------------------

function ExtractorEventRow({
  event,
  cited,
}: {
  event: ExtractorEvent;
  cited: boolean;
}): ReactElement {
  const { selection, set } = useCaseSelection();
  const selected = selection.eventId === event.id;
  const cls = [
    'llmh-cdp__event-row',
    selected ? 'llmh-cdp__event-row--selected' : '',
    cited ? 'llmh-cdp__event-row--cited' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={cls}
      role='button'
      tabIndex={0}
      onClick={() => {
        set({ eventId: event.id });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          set({ eventId: event.id });
        }
      }}
    >
      <MonoValue size='sm'>#{event.id}</MonoValue>
      <Chip tone='default'>{event.kind}</Chip>
      <span>{event.summary}</span>
      {event.source_turns.length > 0 && (
        <MetricLabel size='xs'>
          src=[{event.source_turns.join(',')}]
        </MetricLabel>
      )}
    </div>
  );
}

function ExtractorDetail({
  firing,
  bundle,
}: {
  firing: ExtractorFiring;
  bundle: CaseBundle;
}): ReactElement {
  const { selection, set } = useCaseSelection();
  const payload = firing.input.payload;
  const output = firing.output;

  const citedByFinding = useMemo<Set<number>>(() => {
    if (!selection.findingId) {
      return new Set();
    }
    const aud = bundle.auditor.find(
      (a) => a.sequence === selection.findingId?.auditorSeq,
    );
    const f = aud?.input.findings.find(
      (x) => x.index === selection.findingId?.index,
    );
    return new Set(f?.related_event_ids ?? []);
  }, [selection.findingId, bundle.auditor]);

  return (
    <div className='llmh-cdp__detail'>
      <div className='llmh-cdp__detail-block'>
        <div className='llmh-cdp__detail-head'>
          input.payload
          <MetricLabel size='xs'>
            new_turns={payload.new_turns.length} · threshold=
            {payload.summary_threshold}
          </MetricLabel>
        </div>
        {payload.recent_graph && payload.recent_graph.length > 0 && (
          <details>
            <summary>recent_graph ({payload.recent_graph.length})</summary>
            <pre className='llmh-cdp__pre'>
              {JSON.stringify(payload.recent_graph, null, 2)}
            </pre>
          </details>
        )}
        {payload.case_brief && (
          <details>
            <summary>case_brief</summary>
            <pre className='llmh-cdp__pre'>{payload.case_brief}</pre>
          </details>
        )}
      </div>

      {output ? (
        <>
          <div className='llmh-cdp__detail-block'>
            <div className='llmh-cdp__detail-head'>
              output.events
              <MetricLabel size='xs'>{output.events.length}</MetricLabel>
            </div>
            {output.events.length === 0 ? (
              <EmptyState title='No events' />
            ) : (
              output.events.map((ev) => (
                <ExtractorEventRow
                  key={ev.id}
                  event={ev}
                  cited={citedByFinding.has(ev.id)}
                />
              ))
            )}
          </div>

          <div className='llmh-cdp__detail-block'>
            <div className='llmh-cdp__detail-head'>
              output.edges
              <MetricLabel size='xs'>{output.edges.length}</MetricLabel>
            </div>
            {output.edges.map((edge, i) => (
              <div key={i} className='llmh-cdp__event-row'>
                <MonoValue size='sm'>
                  #{edge.src} → #{edge.dst}
                </MonoValue>
                <Chip tone='default'>{edge.kind}</Chip>
                {edge.reason && <span>{edge.reason}</span>}
              </div>
            ))}
          </div>

          <div
            className={[
              'llmh-cdp__detail-block',
              output.dropped_edges.length > 0 ? 'llmh-cdp__dropped' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className='llmh-cdp__detail-head'>
              output.dropped_edges
              <Chip
                tone={output.dropped_edges.length > 0 ? 'warning' : 'ghost'}
              >
                {output.dropped_edges.length}
              </Chip>
            </div>
            {output.dropped_edges.map((d, i) => (
              <div key={i} className='llmh-cdp__pre'>
                <strong>{d.reason}</strong>
                {d.raw !== undefined && (
                  <>
                    {'\n'}
                    {JSON.stringify(d.raw, null, 2)}
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title={firing.status}
          description={firing.error ?? 'no output'}
        />
      )}

      {selection.eventId !== null && (
        <Chip
          tone='ghost'
          onClick={() => {
            set({ eventId: null, findingId: null });
          }}
        >
          clear event selection
        </Chip>
      )}
    </div>
  );
}

function ExtractorColumn({ bundle }: { bundle: CaseBundle }): ReactElement {
  const { selection, set } = useCaseSelection();
  const firings = bundle.extractor;
  const selected =
    firings.find((f) => f.sequence === selection.extractorSeq) ?? null;

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selection.extractorSeq === null) {
      return;
    }
    const el = listRef.current?.querySelector(
      `[data-seq="${selection.extractorSeq}"]`,
    );
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selection.extractorSeq]);

  return (
    <div className='llmh-cdp__col-split'>
      <div ref={listRef}>
        {firings.length === 0 ? (
          <EmptyState title='No extractor firings' />
        ) : (
          firings.map((f) => {
            const active = selected?.sequence === f.sequence;
            const dropped = f.output?.dropped_edges.length ?? 0;
            const cls = [
              'llmh-cdp__firing-row',
              active ? 'llmh-cdp__firing-row--selected' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={f.sequence}
                data-seq={f.sequence}
                className={cls}
                role='button'
                tabIndex={0}
                onClick={() => {
                  set({ extractorSeq: f.sequence });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    set({ extractorSeq: f.sequence });
                  }
                }}
              >
                <MonoValue size='sm'>E#{f.sequence}</MonoValue>
                <span className='llmh-cdp__firing-meta'>turn {f.turn_index}</span>
                <FiringStatusChip status={f.status} />
                {f.output && (
                  <MetricLabel size='xs'>
                    ev={f.output.events.length} · ed={f.output.edges.length}
                  </MetricLabel>
                )}
                {dropped > 0 && <Chip tone='warning'>dropped {dropped}</Chip>}
              </div>
            );
          })
        )}
      </div>
      <div>
        {selected ? (
          <ExtractorDetail firing={selected} bundle={bundle} />
        ) : (
          <EmptyState
            title='No firing selected'
            description='Pick an extractor firing from the list.'
          />
        )}
      </div>
    </div>
  );
}

// --- Auditor column ------------------------------------------------------

function FindingRow({
  finding,
  firing,
}: {
  finding: Finding;
  firing: AuditorFiring;
}): ReactElement {
  const { selection, set } = useCaseSelection();
  const selected =
    selection.findingId?.auditorSeq === firing.sequence &&
    selection.findingId.index === finding.index;
  const cls = [
    'llmh-cdp__finding',
    selected ? 'llmh-cdp__finding--selected' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={cls}
      role='button'
      tabIndex={0}
      onClick={() => {
        set({
          findingId: { auditorSeq: firing.sequence, index: finding.index },
        });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          set({
            findingId: { auditorSeq: firing.sequence, index: finding.index },
          });
        }
      }}
    >
      <div className='llmh-cdp__main-meta'>
        <MonoValue size='sm'>F#{finding.index}</MonoValue>
        <Chip tone='default'>{finding.kind}</Chip>
      </div>
      <span>{finding.summary}</span>
      {finding.related_event_ids.length > 0 && (
        <div className='llmh-cdp__chip-row'>
          {finding.related_event_ids.map((id) => (
            <span
              key={id}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              role='presentation'
            >
              <Chip
                tone={selection.eventId === id ? 'ink' : 'default'}
                onClick={() => {
                  set({ eventId: id });
                }}
              >
                #{id}
              </Chip>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditorDetail({ firing }: { firing: AuditorFiring }): ReactElement {
  const { selection, set } = useCaseSelection();
  const input = firing.input;
  const output = firing.output;
  const checkErrorKeys = Object.keys(input.check_errors);
  return (
    <div className='llmh-cdp__detail'>
      <div className='llmh-cdp__detail-block'>
        <div className='llmh-cdp__detail-head'>
          context
          <MetricLabel size='xs'>
            graph_snapshot_ref=
            <Chip
              tone={
                selection.extractorSeq === input.graph_snapshot_ref
                  ? 'ink'
                  : 'default'
              }
              onClick={() => {
                set({ extractorSeq: input.graph_snapshot_ref });
              }}
            >
              E#{input.graph_snapshot_ref}
            </Chip>{' '}
            · profile=
            {input.tools_profile} · traj={input.trajectory_snapshot_len}
          </MetricLabel>
        </div>
      </div>

      <div className='llmh-cdp__detail-block'>
        <div className='llmh-cdp__detail-head'>
          input.findings
          <MetricLabel size='xs'>{input.findings.length}</MetricLabel>
        </div>
        {input.findings.map((f) => (
          <FindingRow key={f.index} finding={f} firing={firing} />
        ))}
      </div>

      {input.continuation_notes.length > 0 && (
        <div className='llmh-cdp__detail-block'>
          <div className='llmh-cdp__detail-head'>continuation_notes</div>
          {input.continuation_notes.map((n, i) => (
            <div key={i} className='llmh-cdp__pre'>
              {n}
            </div>
          ))}
        </div>
      )}

      {checkErrorKeys.length > 0 && (
        <details className='llmh-cdp__detail-block'>
          <summary>check_errors ({checkErrorKeys.length})</summary>
          <pre className='llmh-cdp__pre'>
            {JSON.stringify(input.check_errors, null, 2)}
          </pre>
        </details>
      )}

      <div className='llmh-cdp__detail-block'>
        <div className='llmh-cdp__detail-head'>
          output
          {output && (
            <Chip tone={output.surface_reminder ? 'warning' : 'ghost'}>
              {output.surface_reminder ? 'surfaced' : 'silent'}
            </Chip>
          )}
        </div>
        {!output ? (
          <EmptyState
            title={firing.status}
            description={firing.error ?? 'no output'}
          />
        ) : (
          <>
            {output.reminder_text && (
              <div className='llmh-cdp__pre'>{output.reminder_text}</div>
            )}
            {output.matched_event_ids && output.matched_event_ids.length > 0 && (
              <div className='llmh-cdp__chip-row'>
                {output.matched_event_ids.map((id) => (
                  <Chip
                    key={id}
                    tone={selection.eventId === id ? 'ink' : 'default'}
                    onClick={() => {
                      set({ eventId: id });
                    }}
                  >
                    matched #{id}
                  </Chip>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AuditorColumn({ bundle }: { bundle: CaseBundle }): ReactElement {
  const { selection, set } = useCaseSelection();
  const firings = bundle.auditor;

  const targetSeqFromEvent = useMemo<number | null>(() => {
    if (selection.eventId === null) {
      return null;
    }
    return bundle.links.eventToAuditor.get(selection.eventId)?.[0] ?? null;
  }, [selection.eventId, bundle.links.eventToAuditor]);

  const effectiveSeq =
    selection.auditorSeq ?? targetSeqFromEvent ?? firings[0]?.sequence ?? null;
  const selected = firings.find((f) => f.sequence === effectiveSeq) ?? null;

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (effectiveSeq === null) {
      return;
    }
    const el = listRef.current?.querySelector(`[data-seq="${effectiveSeq}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [effectiveSeq]);

  return (
    <div className='llmh-cdp__col-split'>
      <div ref={listRef}>
        {firings.length === 0 ? (
          <EmptyState title='No auditor firings' />
        ) : (
          firings.map((f) => {
            const active = effectiveSeq === f.sequence;
            const cls = [
              'llmh-cdp__firing-row',
              active ? 'llmh-cdp__firing-row--selected' : '',
            ]
              .filter(Boolean)
              .join(' ');
            const surfaced = Boolean(f.output?.surface_reminder);
            return (
              <div
                key={f.sequence}
                data-seq={f.sequence}
                className={cls}
                role='button'
                tabIndex={0}
                onClick={() => {
                  set({ auditorSeq: f.sequence });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    set({ auditorSeq: f.sequence });
                  }
                }}
              >
                <MonoValue size='sm'>A#{f.sequence}</MonoValue>
                <span className='llmh-cdp__firing-meta'>turn {f.turn_index}</span>
                <FiringStatusChip status={f.status} />
                {f.output && (
                  <Chip tone={surfaced ? 'warning' : 'ghost'}>
                    {surfaced ? 'surfaced' : 'silent'}
                  </Chip>
                )}
              </div>
            );
          })
        )}
      </div>
      <div>
        {selected ? (
          <AuditorDetail firing={selected} />
        ) : (
          <EmptyState title='No auditor firing selected' />
        )}
      </div>
    </div>
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

function SftDrawer({ repo, caseId, rootSessionId }: SftDrawerProps): ReactElement {
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
      ? `${sft.extractor.length} ext · ${sft.auditor.length} aud · ${sft.dropped.length} dropped`
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
              <div className='llmh-cdp__chip-row' style={{ marginBottom: 8 }}>
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
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <div>
                    {rows.map((r) => (
                      <button
                        key={`${r.root_session_id}#${r.turn_index}#${r.sequence ?? ''}`}
                        type='button'
                        className='llmh-cdp__event-row'
                        onClick={() => {
                          setSelected(r);
                        }}
                      >
                        <MonoValue size='sm'>turn {r.turn_index}</MonoValue>
                        {r.sequence !== undefined && (
                          <MetricLabel size='xs'>seq {r.sequence}</MetricLabel>
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

function ColumnHeader({ children }: { children: ReactNode }): ReactElement {
  return <div className='llmh-cdp__col-head'>{children}</div>;
}

function CaseDetailBody({ data }: { data: LoadedCase }): ReactElement {
  return (
    <div className='llmh-cdp'>
      <div className='llmh-cdp__columns'>
        <div className='llmh-cdp__col' style={{ flex: '2 1 0' }}>
          <ColumnHeader>
            Main agent
            <MetricLabel size='xs'>{data.bundle.main.length} turns</MetricLabel>
          </ColumnHeader>
          <MainColumn bundle={data.bundle} />
        </div>
        <div className='llmh-cdp__col'>
          <ColumnHeader>
            Extractor
            <MetricLabel size='xs'>
              {data.bundle.extractor.length} firings
            </MetricLabel>
          </ColumnHeader>
          <div className='llmh-cdp__col-body'>
            <ExtractorColumn bundle={data.bundle} />
          </div>
        </div>
        <div className='llmh-cdp__col'>
          <ColumnHeader>
            Auditor
            <MetricLabel size='xs'>
              {data.bundle.auditor.length} firings
            </MetricLabel>
          </ColumnHeader>
          <div className='llmh-cdp__col-body'>
            <AuditorColumn bundle={data.bundle} />
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
