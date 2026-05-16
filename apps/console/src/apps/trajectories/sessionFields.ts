import type {
  FieldMapping,
  QueryAutocompleteFieldSuggestion,
} from '@lincyaw/aegis-ui';

/**
 * Lucene → ClickHouse column map for the SessionList search box.
 *
 * Constraints (these all live in the per-span WHERE, BEFORE GROUP BY):
 *   - Only fields readable from a single span row are usable here.
 *   - Aggregated predicates (errorCount > 0, turn_count, …) belong in
 *     HAVING and aren't supported by this surface yet.
 */
export const SESSION_FIELD_MAPPINGS: FieldMapping[] = [
  { field: 'trace_id', sqlExpr: 'TraceId' },
  { field: 'service.name', sqlExpr: 'ServiceName' },
  { field: 'span_name', sqlExpr: 'SpanName' },
  { field: 'span_kind', sqlExpr: 'SpanKind' },
  { field: 'status', sqlExpr: 'StatusCode' },
  {
    field: 'agentm.root_session_id',
    sqlExpr: "SpanAttributes['agentm.root_session_id']",
  },
  {
    field: 'agentm.session_id',
    sqlExpr: "SpanAttributes['agentm.session_id']",
  },
  {
    field: 'agentm.parent_session_id',
    sqlExpr: "SpanAttributes['agentm.parent_session_id']",
  },
  { field: 'model', sqlExpr: "SpanAttributes['gen_ai.request.model']" },
  { field: 'duration', sqlExpr: 'Duration', kind: 'number' },
];

export const SESSION_FIELD_SUGGESTIONS: QueryAutocompleteFieldSuggestion[] =
  SESSION_FIELD_MAPPINGS.map((m) => ({
    value: m.field,
    hint: m.kind === 'number' ? 'number' : undefined,
  }));

/** Constant value-completions for a few common, low-cardinality fields. */
export function suggestSessionFieldValues(
  field: string,
): Array<{ value: string; hint?: string }> {
  switch (field) {
    case 'status':
      return [
        { value: 'STATUS_CODE_OK', hint: 'ok' },
        { value: 'STATUS_CODE_ERROR', hint: 'error' },
        { value: 'STATUS_CODE_UNSET', hint: 'unset' },
      ];
    case 'span_kind':
      return [
        { value: 'SPAN_KIND_INTERNAL' },
        { value: 'SPAN_KIND_CLIENT' },
        { value: 'SPAN_KIND_SERVER' },
        { value: 'SPAN_KIND_PRODUCER' },
        { value: 'SPAN_KIND_CONSUMER' },
      ];
    case 'span_name':
      return [
        { value: 'agentm.session' },
        { value: 'agentm.turn' },
        { value: 'agentm.tool.execute' },
      ];
    default:
      return [];
  }
}
