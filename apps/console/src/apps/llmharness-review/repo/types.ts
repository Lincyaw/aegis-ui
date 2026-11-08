import type {
  AuditorFiring,
  CaseBundle,
  CaseMeta,
  CaseSummary,
  DroppedRow,
  ExtractorFiring,
  FiringPhase,
  GraphSnapshot,
  MainTurn,
  SftRow,
} from '../schemas';

export interface CaseSftBundle {
  extractor: SftRow[];
  auditor: SftRow[];
  dropped: DroppedRow[];
}

/**
 * An SFT export kept beside the cases instead of inside each one, holding
 * the rows of every case. A case without its own SFT shows the rows whose
 * `root_session_id` is its root session.
 */
export interface SharedSftSource {
  /** Names the export; sources with the same key read the same files. */
  readonly key: string;
  read(): Promise<CaseSftBundle>;
}

/**
 * Read-only access to a `cases/` root. Paths are relative to the case
 * directory; reads are lazy and return plain data, so UI state stays in the
 * pages. Every file is checked against its schema as it is read, and a file
 * that does not match rejects with a `CaseFileError`.
 */
export interface CaseRepo {
  /** Cosmetic label shown in headers; not load-bearing. */
  readonly label: string;
  listCases(): Promise<CaseSummary[]>;
  readMeta(caseId: string): Promise<CaseMeta>;
  readMainAgent(caseId: string): Promise<MainTurn[]>;
  /** Firing file names of a phase; empty when the case has no such phase. */
  listFiringFiles(caseId: string, phase: FiringPhase): Promise<string[]>;
  readFiring(
    caseId: string,
    phase: FiringPhase,
    fileName: string
  ): Promise<ExtractorFiring | AuditorFiring>;
  /** Cumulative graph state after an extractor firing succeeded, or null
   *  when the snapshot does not exist (the firing didn't advance it). */
  readSnapshot(
    caseId: string,
    extractorSequence: number
  ): Promise<GraphSnapshot | null>;
  /** Meta, main turns, firings and graph snapshots with the cross-pane link
   *  index. SFT is excluded; pages load it lazily. */
  loadBundle(caseId: string): Promise<CaseBundle>;
  /** The case's own SFT rows, or `null` when this source has none for it. */
  loadSftForCase(caseId: string): Promise<CaseSftBundle | null>;
  /** The export shared by the source's cases, or `null` when it has none. */
  readonly sharedSft: SharedSftSource | null;
}

/** A sibling `sft/` directory holding extractor / auditor / dropped JSONL. */
export interface SftRepo {
  readonly label: string;
  readExtractor(): Promise<SftRow[]>;
  readAuditor(): Promise<SftRow[]>;
  readDropped(): Promise<DroppedRow[]>;
}
