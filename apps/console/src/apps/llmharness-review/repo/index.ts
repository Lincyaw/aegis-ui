import { probeBlobCaseRepo } from './blob';
import { restoreCasesRoot } from './handleStore';
import { probeHttpCaseRepo } from './http';
import type { CaseRepo } from './types';

export {
  BlobCaseRepo,
  BlobSftRepo,
  probeBlobCaseRepo,
  probeBlobSftRepo,
} from './blob';
export { sftForSession } from './bundle';
export { FSAccessCaseRepo, FSAccessSftRepo } from './fsAccess';
export {
  clearStoredRoot,
  clearStoredSftRoot,
  isFsAccessSupported,
  pickCasesRoot,
  pickSftRoot,
  restoreCasesRoot,
  restoreSftRoot,
} from './handleStore';
export { HttpCaseRepo, probeHttpCaseRepo } from './http';
export type { CaseRepo, CaseSftBundle, SftRepo } from './types';

/** First configured source wins: `llmharness serve` URL → blob root →
 *  previously picked local directory. */
export async function resolveCaseRepo(): Promise<CaseRepo | null> {
  return (
    (await probeHttpCaseRepo()) ?? probeBlobCaseRepo() ?? restoreCasesRoot()
  );
}
