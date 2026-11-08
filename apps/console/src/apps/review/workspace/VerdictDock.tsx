import { type ReactElement, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Checkbox, DecisionBar, MetricLabel } from '@lincyaw/aegis-ui';
import type { Verdict, VerdictOption } from '@lincyaw/review-api';

import { fmtClock } from '../evidence/format';
import { useReviewStrings } from '../locale/context';

import type { SaveState } from './useVerdictSaver';

const NOTE_DELAY_MS = 700;

/** Why verdicts cannot be saved. */
export interface Blocked {
  text: string;
  /** Setting a reviewer name on the Connection page unblocks it. */
  setReviewer: boolean;
}

interface VerdictDockProps {
  itemId: string;
  options: VerdictOption[];
  verdict: Verdict | undefined;
  /** Why verdicts cannot be saved, or undefined when they can. */
  blocked: Blocked | undefined;
  saveState: SaveState;
  /** Saves a note change under the verdict already given. */
  onSave: (value: string, note: string) => void;
  /** A verdict was chosen. */
  onJudge: (value: string) => void;
  advance: boolean;
  onAdvance: (value: boolean) => void;
  noteRef: React.RefObject<HTMLTextAreaElement>;
  note: string;
  onNote: (note: string) => void;
}

function SaveStatus({
  itemId,
  state,
  verdict,
}: {
  itemId: string;
  state: SaveState;
  verdict: Verdict | undefined;
}): ReactElement {
  const s = useReviewStrings();
  if (state.status !== 'idle' && state.itemId === itemId) {
    if (state.status === 'saving') {
      return <span className='review-dock__status'>{s.saving}</span>;
    }
    if (state.status === 'error') {
      return (
        <span className='review-dock__status review-dock__status--error'>
          {s.notSaved(state.message)}
        </span>
      );
    }
    return (
      <span className='review-dock__status review-dock__status--saved'>
        {s.savedAt(fmtClock(state.at, 'second'))}
      </span>
    );
  }
  return (
    <span className='review-dock__status'>
      {verdict === undefined
        ? s.notJudged
        : s.savedAt(fmtClock(verdict.updatedAt, 'second'))}
    </span>
  );
}

export function VerdictDock({
  itemId,
  options,
  verdict,
  blocked,
  saveState,
  onSave,
  onJudge,
  advance,
  onAdvance,
  noteRef,
  note,
  onNote,
}: VerdictDockProps): ReactElement {
  const s = useReviewStrings();
  const [pending, setPending] = useState(false);
  const timer = useRef<number | undefined>();

  useEffect(() => {
    window.clearTimeout(timer.current);
    setPending(false);
  }, [itemId]);

  const changeNote = (next: string): void => {
    onNote(next);
    if (verdict === undefined || blocked !== undefined) {
      return;
    }
    window.clearTimeout(timer.current);
    setPending(true);
    timer.current = window.setTimeout(() => {
      setPending(false);
      onSave(verdict.value, next);
    }, NOTE_DELAY_MS);
  };

  const flush = (): void => {
    if (pending && verdict !== undefined) {
      window.clearTimeout(timer.current);
      setPending(false);
      onSave(verdict.value, note);
    }
  };

  return (
    <footer className='review-dock'>
      <div className='review-dock__decision'>
        <DecisionBar
          options={options.map((o) => ({
            value: o.value,
            label: o.label,
            description: o.description,
            tone: o.tone,
            shortcut: o.shortcut,
          }))}
          value={verdict?.value ?? null}
          onChange={(value) => {
            window.clearTimeout(timer.current);
            setPending(false);
            onJudge(value);
          }}
          disabled={blocked !== undefined}
          ariaLabel={s.verdict}
        />
      </div>
      <div className='review-dock__note'>
        <textarea
          ref={noteRef}
          className='review-dock__textarea'
          rows={2}
          value={note}
          placeholder={s.notePlaceholder}
          aria-label={s.note}
          disabled={blocked !== undefined}
          onChange={(event) => {
            changeNote(event.target.value);
          }}
          onBlur={flush}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.currentTarget.blur();
            }
          }}
        />
        <div className='review-dock__meta'>
          {blocked === undefined ? (
            <SaveStatus itemId={itemId} state={saveState} verdict={verdict} />
          ) : (
            <span className='review-dock__status review-dock__status--warn'>
              {blocked.text}{' '}
              {blocked.setReviewer && (
                <Link to='../../connection' relative='path'>
                  {s.setIt}
                </Link>
              )}
            </span>
          )}
          <Checkbox
            checked={advance}
            onChange={onAdvance}
            label={<MetricLabel>{s.advance}</MetricLabel>}
          />
        </div>
      </div>
    </footer>
  );
}
