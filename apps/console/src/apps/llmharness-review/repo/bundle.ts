import { ApiError } from '../../../api/apiClient';
import {
  type AuditorFiring,
  type CaseBundle,
  computeCaseLinks,
  type ExtractorFiring,
  type GraphSnapshot,
} from '../schemas';

import type { CaseRepo, CaseSftBundle } from './types';

/** A missing file or directory, from the FS Access API or an HTTP 404. The
 *  only failure a repo treats as "absent"; every other error propagates. */
export function isNotFound(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'NotFoundError') ||
    (err instanceof ApiError && err.status === 404)
  );
}

export function isEmptySft(sft: CaseSftBundle): boolean {
  return (
    sft.extractor.length === 0 &&
    sft.auditor.length === 0 &&
    sft.dropped.length === 0
  );
}

/** Firing files named `<seq>_turn_<turn>.json`, with their sequence. */
function firingFiles(names: string[]): Array<{ file: string; seq: number }> {
  const out: Array<{ file: string; seq: number }> = [];
  for (const file of names) {
    const m = /^(\d+)_turn_(\d+)\.json$/.exec(file);
    if (m) {
      out.push({ file, seq: Number(m[1]) });
    }
  }
  return out;
}

/** Shared `loadBundle` body: reads every file of a case through the repo. */
export async function loadBundleViaRepo(
  repo: CaseRepo,
  caseId: string
): Promise<CaseBundle> {
  const [meta, main, extractorFiles, auditorFiles] = await Promise.all([
    repo.readMeta(caseId),
    repo.readMainAgent(caseId),
    repo.listFiringFiles(caseId, 'extractor'),
    repo.listFiringFiles(caseId, 'auditor'),
  ]);

  const extractorNames = firingFiles(extractorFiles);
  const auditorNames = firingFiles(auditorFiles);

  const [extractor, auditor, snapshots] = await Promise.all([
    Promise.all(
      extractorNames.map(
        async ({ file }) =>
          (await repo.readFiring(caseId, 'extractor', file)) as ExtractorFiring
      )
    ),
    Promise.all(
      auditorNames.map(
        async ({ file }) =>
          (await repo.readFiring(caseId, 'auditor', file)) as AuditorFiring
      )
    ),
    Promise.all(
      extractorNames.map(async ({ seq }) => ({
        seq,
        snap: await repo.readSnapshot(caseId, seq),
      }))
    ),
  ]);

  extractor.sort((a, b) => a.sequence - b.sequence);
  auditor.sort((a, b) => a.sequence - b.sequence);
  const graphs = new Map<number, GraphSnapshot>();
  for (const { seq, snap } of snapshots) {
    if (snap) {
      graphs.set(seq, snap);
    }
  }

  const partial: Omit<CaseBundle, 'links'> = {
    meta,
    main,
    extractor,
    auditor,
    graphs,
  };
  return { ...partial, links: computeCaseLinks(partial) };
}
