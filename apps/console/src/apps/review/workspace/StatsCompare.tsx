import type { ReactElement } from 'react';

import type { StatsPair } from '@lincyaw/review-api';

import { THRESHOLDS } from '../evidence/classify';
import { fmtCount, fmtMs, fmtPct, fmtPp, fmtRatio } from '../evidence/format';
import { useReviewStrings } from '../locale/context';

type Tone = 'alarm' | 'caution' | undefined;

interface Row {
  label: string;
  normal: string;
  abnormal: string;
  change: string;
  tone: Tone;
}

function ratioCell(
  a: number | undefined,
  b: number | undefined
): { text: string; tone: Tone } {
  if (a === undefined || b === undefined || a <= 0) {
    return { text: '–', tone: undefined };
  }
  const r = b / a;
  return {
    text: fmtRatio(r),
    tone: r >= THRESHOLDS.latencyRatio ? 'caution' : undefined,
  };
}

/** A pair of window summaries side by side, with the change between them. */
export function StatsCompare({ stats }: { stats: StatsPair }): ReactElement {
  const s = useReviewStrings();
  const { normal: n, abnormal: a } = stats;
  const errDelta = a.errorRate - n.errorRate;
  const p50 = ratioCell(n.p50Ms, a.p50Ms);
  const p95 = ratioCell(n.p95Ms, a.p95Ms);
  const rows: Row[] = [
    {
      label: s.rowCalls,
      normal: fmtCount(n.calls),
      abnormal: fmtCount(a.calls),
      change: n.calls > 0 ? fmtRatio(a.calls / n.calls) : '–',
      tone: undefined,
    },
    {
      label: s.rowErrors,
      normal: fmtPct(n.errorRate),
      abnormal: a.calls > 0 ? fmtPct(a.errorRate) : '–',
      change: n.calls > 0 && a.calls > 0 ? fmtPp(errDelta) : '–',
      tone:
        a.calls > 0 && errDelta >= THRESHOLDS.errorRise ? 'alarm' : undefined,
    },
    {
      label: s.rowP50,
      normal: fmtMs(n.p50Ms),
      abnormal: fmtMs(a.p50Ms),
      change: p50.text,
      tone: p50.tone,
    },
    {
      label: s.rowP95,
      normal: fmtMs(n.p95Ms),
      abnormal: fmtMs(a.p95Ms),
      change: p95.text,
      tone: p95.tone,
    },
  ];
  return (
    <table className='review-compare'>
      <thead>
        <tr>
          <th scope='col' aria-label={s.colMeasure} />
          <th scope='col'>{s.colNormal}</th>
          <th scope='col'>{s.colAbnormal}</th>
          <th scope='col'>{s.colChange}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope='row'>{row.label}</th>
            <td>{row.normal}</td>
            <td>{row.abnormal}</td>
            <td
              className={
                row.tone === undefined
                  ? undefined
                  : `review-compare__change--${row.tone}`
              }
            >
              {row.change}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
