/**
 * Auditor view: chat transcript + a panel of all verdicts emitted on
 * this session, latest first. A verdict whose ``surface_reminder`` is
 * true is highlighted in purple — that's the firing the main agent
 * will actually see.
 */

import { type ReactElement, useMemo } from 'react';

import { ChatTranscript } from '../components/ChatTranscript';
import { useSessionTimeline } from '../store/useInspectStream';

import './AuditorView.css';

interface Props {
  sessionId: string;
}

interface VerdictRow {
  ts: number;
  surface_reminder: boolean;
  reminder_text: string;
  matched_event_ids: number[];
  continuation_notes: string[];
}

export function AuditorView({ sessionId }: Props): ReactElement {
  const items = useSessionTimeline(sessionId);

  const verdicts = useMemo(() => {
    const out: VerdictRow[] = [];
    for (const it of items) {
      if (it.source === 'entry' && it.entry_type === 'llmharness.verdict') {
        const p = it.payload;
        out.push({
          ts: it.ts,
          surface_reminder: Boolean(p.surface_reminder),
          reminder_text: typeof p.reminder_text === 'string' ? p.reminder_text : '',
          matched_event_ids: Array.isArray(p.matched_event_ids)
            ? (p.matched_event_ids as unknown[])
                .map((v) => Number(v))
                .filter((n) => Number.isFinite(n))
            : [],
          continuation_notes: Array.isArray(p.continuation_notes)
            ? (p.continuation_notes as unknown[]).map((v) => String(v))
            : [],
        });
      }
    }
    return out.reverse();
  }, [items]);

  return (
    <div className='lh-aud'>
      <div className='lh-aud__head'>
        <span className='lh-aud__tag'>auditor</span>
        <span className='lh-aud__stat'>
          {verdicts.length.toString()} verdict{verdicts.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className='lh-aud__chat'>
        <ChatTranscript items={items} />
      </div>
      <div className='lh-aud__verdicts'>
        {verdicts.length === 0 ? (
          <div className='lh-aud__empty'>No verdicts yet.</div>
        ) : (
          verdicts.map((v, i) => (
            <div
              key={i.toString()}
              className={`lh-aud__verdict ${
                v.surface_reminder ? 'lh-aud__verdict--surface' : ''
              }`}
            >
              <div className='lh-aud__verdict-head'>
                <span className='lh-aud__verdict-flag'>
                  {v.surface_reminder ? 'surface_reminder' : 'silent'}
                </span>
                {v.matched_event_ids.length > 0 && (
                  <span className='lh-aud__verdict-events'>
                    matched events:{' '}
                    {v.matched_event_ids.map((id) => `#${id.toString()}`).join(', ')}
                  </span>
                )}
              </div>
              {v.reminder_text && (
                <div className='lh-aud__verdict-text'>{v.reminder_text}</div>
              )}
              {v.continuation_notes.length > 0 && (
                <ul className='lh-aud__verdict-notes'>
                  {v.continuation_notes.map((n, ni) => (
                    <li key={ni.toString()}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
