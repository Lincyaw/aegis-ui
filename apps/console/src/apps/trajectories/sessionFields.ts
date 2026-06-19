import type {
  FieldMapping,
  QueryAutocompleteFieldSuggestion,
} from '@lincyaw/aegis-ui';

/**
 * Lucene → ClickHouse column map for the SessionList search box.
 *
 * Constraints (these all live on agentm.session.start log attributes):
 *   - Only fields readable from the session-start row are usable here.
 *   - Aggregated predicates (tool_count, turn_count, …) belong in
 *     HAVING and aren't supported by this surface yet.
 */
export const SESSION_FIELD_MAPPINGS: FieldMapping[] = [
  {
    field: 'session_id',
    sqlExpr: "LogAttributes['agentm.session.id']",
  },
  {
    field: 'root_session_id',
    sqlExpr: "LogAttributes['agentm.session.root_id']",
  },
  {
    field: 'parent_session_id',
    sqlExpr: "LogAttributes['agentm.session.parent_id']",
  },
  { field: 'scenario', sqlExpr: "LogAttributes['agentm.session.scenario']" },
  { field: 'purpose', sqlExpr: "LogAttributes['agentm.session.purpose']" },
  {
    field: 'lineage.kind',
    sqlExpr: "LogAttributes['agentm.session.lineage.kind']",
  },
  {
    field: 'lineage.source_session_id',
    sqlExpr: "LogAttributes['agentm.session.lineage.source_session_id']",
  },
  {
    field: 'fork.message_id',
    sqlExpr: "LogAttributes['agentm.session.lineage.fork.message_id']",
  },
  {
    field: 'cwd',
    sqlExpr: "LogAttributes['agentm.session.cwd']",
  },
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
    case 'scenario':
      return [{ value: 'rca' }, { value: 'local' }, { value: 'verifier' }];
    case 'lineage.kind':
      return [
        { value: 'root' },
        { value: 'fork' },
        { value: 'sub_agent' },
        { value: 'workflow_worker' },
      ];
    case 'purpose':
      return [{ value: 'root' }, { value: 'worker' }, { value: 'critic' }];
    default:
      return [];
  }
}
