import type { ReactElement, ReactNode } from 'react';

import { Chip } from '@lincyaw/aegis-ui';
import type { StatsPair } from '@lincyaw/review-api';

import {
  type Change,
  changeRank,
  changeShort,
  classify,
} from '../evidence/classify';
import { fmtCount, fmtMsBare } from '../evidence/format';
import { useReviewStrings } from '../locale/context';

export interface CallRow {
  key: string;
  /** What the row is: a service, or a pair of endpoints. */
  name: ReactNode;
  stats: StatsPair;
  /** Marked in the table, e.g. the link under review. */
  current?: boolean;
  tag?: string;
}

const CHANGE_CLASS: Partial<Record<Change, string>> = {
  errors: 'review-calls__change--alarm',
  slower: 'review-calls__change--caution',
};

interface CallTableProps {
  rows: CallRow[];
  nameHeader: string;
  ariaLabel: string;
  onOpen?: (row: CallRow) => void;
  emptyTitle?: string;
}

/**
 * Calls compared across the two windows, the most changed first, so a
 * change every row shares reads as the whole system slowing down. Dense
 * enough for the details panel; a row opens with a click or Enter.
 */
export function CallTable({
  rows,
  nameHeader,
  ariaLabel,
  onOpen,
  emptyTitle,
}: CallTableProps): ReactElement {
  const s = useReviewStrings();
  if (rows.length === 0) {
    return <p className='review-calls__empty'>{emptyTitle ?? s.noCalls}</p>;
  }
  const sorted = rows
    .map((row) => ({ row, c: classify(row.stats) }))
    .sort(
      (a, b) =>
        changeRank(b.c) - changeRank(a.c) ||
        (b.c.latencyRatio ?? 0) - (a.c.latencyRatio ?? 0) ||
        b.row.stats.abnormal.calls - a.row.stats.abnormal.calls
    );
  return (
    <table className='review-calls' aria-label={ariaLabel}>
      <thead>
        <tr>
          <th scope='col'>{nameHeader}</th>
          <th scope='col'>{s.colCalls}</th>
          <th scope='col'>{s.colP95}</th>
          <th scope='col'>{s.colChange}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(({ row, c }) => {
          const { normal: n, abnormal: a } = row.stats;
          return (
            <tr
              key={row.key}
              className={[
                onOpen === undefined ? '' : 'review-calls__row--open',
                row.current === true ? 'review-calls__row--current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={row.current === true ? 'true' : undefined}
              onClick={
                onOpen === undefined
                  ? undefined
                  : () => {
                      onOpen(row);
                    }
              }
            >
              <th scope='row'>
                <span className='review-calls__name'>
                  {onOpen === undefined ? (
                    <span className='review-calls__name-text'>{row.name}</span>
                  ) : (
                    <button
                      type='button'
                      className='review-calls__name-text review-calls__open'
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(row);
                      }}
                    >
                      {row.name}
                    </button>
                  )}
                  {row.tag !== undefined && (
                    <Chip tone='caution' size='sm'>
                      {row.tag}
                    </Chip>
                  )}
                </span>
              </th>
              <td>{`${fmtCount(n.calls)} → ${fmtCount(a.calls)}`}</td>
              <td>{`${fmtMsBare(n.p95Ms)} → ${fmtMsBare(a.p95Ms)}`}</td>
              <td className={CHANGE_CLASS[c.change]}>
                {changeShort(c, s) || '–'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
