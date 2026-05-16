/**
 * Hook + types for cross-pane selection. The matching <CaseSelectionProvider>
 * lives in selection.tsx; this file is split out so react-refresh can keep
 * the hook hot-swappable without disabling component-only-exports.
 */

import { createContext, useContext } from 'react';

export type InspectorMode = 'extractor' | 'auditor';

export interface CaseSelection {
  /**
   * Which inspector pane is active. The timeline writes this together
   * with extractorSeq / auditorSeq; nothing else should mutate it
   * (so cross-pane chip clicks inside an inspector stay in the same mode).
   */
  mode: InspectorMode | null;
  turn: number | null;
  extractorSeq: number | null;
  auditorSeq: number | null;
  eventId: number | null;
  findingId: { auditorSeq: number; index: number } | null;
}

export interface CaseSelectionApi {
  selection: CaseSelection;
  set(patch: Partial<CaseSelection>): void;
}

export const EMPTY_SELECTION: CaseSelection = {
  mode: null,
  turn: null,
  extractorSeq: null,
  auditorSeq: null,
  eventId: null,
  findingId: null,
};

export const CaseSelectionContext = createContext<CaseSelectionApi | null>(
  null,
);

export function useCaseSelection(): CaseSelectionApi {
  const v = useContext(CaseSelectionContext);
  if (!v) {
    throw new Error(
      'useCaseSelection must be used inside <CaseSelectionProvider>',
    );
  }
  return v;
}
