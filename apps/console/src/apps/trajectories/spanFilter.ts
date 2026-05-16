import type { SpanRow } from './api/clickhouse';

import type { TrajectoriesPrefs } from './prefs';
import { classifyWithRules } from './spanKind';

/**
 * Apply user filters (kind / min-duration / errors-only) to a span set.
 * Pure — no React, no I/O — so views can call it inside ``useMemo``.
 */
export function applySpanFilter(
  spans: SpanRow[],
  prefs: TrajectoriesPrefs,
  scopeSessionId: string
): SpanRow[] {
  const minNs = prefs.minDurationMs * 1_000_000;
  const hidden = new Set(prefs.hiddenSpanKinds);

  // When a session is scoped, restrict to spans that belong to its
  // sub-tree. We compute that via OTel parent_span_id walk: collect
  // every spanId reachable from the session's session_id span_id.
  let allowedSpanIds: Set<string> | null = null;
  if (scopeSessionId) {
    const sessionSpan = spans.find(
      (s) =>
        s.name === 'agentm.session' &&
        s.attributes['agentm.session_id'] === scopeSessionId
    );
    if (sessionSpan) {
      allowedSpanIds = new Set<string>([sessionSpan.spanId]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const s of spans) {
          if (
            allowedSpanIds.has(s.parentSpanId) &&
            !allowedSpanIds.has(s.spanId)
          ) {
            allowedSpanIds.add(s.spanId);
            grew = true;
          }
        }
      }
    } else {
      allowedSpanIds = new Set();
    }
  }

  return spans.filter((s) => {
    if (allowedSpanIds && !allowedSpanIds.has(s.spanId)) {
      return false;
    }
    if (hidden.has(classifyWithRules(s.name, prefs.customSpanRules))) {
      return false;
    }
    if (s.durationNs < minNs) {
      return false;
    }
    if (prefs.errorsOnly && s.statusCode !== 'STATUS_CODE_ERROR') {
      return false;
    }
    return true;
  });
}
