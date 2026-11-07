const sourceIds = new WeakMap<object, number>();
let nextSourceId = 0;

/** Tells source instances apart, so rows read from one source are never
 *  served for another. */
function sourceId(source: object | null): number | null {
  if (!source) {
    return null;
  }
  let id = sourceIds.get(source);
  if (id === undefined) {
    nextSourceId += 1;
    id = nextSourceId;
    sourceIds.set(source, id);
  }
  return id;
}

export const llmhKeys = {
  caseSource: ['llmharness', 'case-source'] as const,
  sftSource: ['llmharness', 'sft-source'] as const,
  cases: (source: object | null) =>
    ['llmharness', 'cases', sourceId(source)] as const,
  sft: (source: object | null) =>
    ['llmharness', 'sft', sourceId(source)] as const,
  caseSft: (source: object, caseId: string) =>
    ['llmharness', 'case-sft', sourceId(source), caseId] as const,
  caseBundle: (caseId: string) =>
    ['llmharness', 'case-bundle', caseId] as const,
};
