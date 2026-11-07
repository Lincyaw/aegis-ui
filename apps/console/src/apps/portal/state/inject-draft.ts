import { type GuidedInjectionSpec, parseSpec } from '../domain/injectSpec';

/** The injection wizard's unfinished spec, kept per project for this tab. */

function draftKey(projectId: number): string {
  return `inject-guided-draft:${String(projectId)}`;
}

/** The stored draft, or `null` when there is none worth offering. */
export function readDraft(projectId: number): GuidedInjectionSpec | null {
  const raw = sessionStorage.getItem(draftKey(projectId));
  if (raw === null) {
    return null;
  }
  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch (err) {
    if (!(err instanceof SyntaxError)) {
      throw err;
    }
    clearDraft(projectId);
    return null;
  }
  const draft = parseSpec(stored);
  if (draft === null) {
    clearDraft(projectId);
    return null;
  }
  return draft.systemCode !== '' || draft.chaosType !== '' ? draft : null;
}

export function saveDraft(projectId: number, spec: GuidedInjectionSpec): void {
  sessionStorage.setItem(draftKey(projectId), JSON.stringify(spec));
}

export function clearDraft(projectId: number): void {
  sessionStorage.removeItem(draftKey(projectId));
}
