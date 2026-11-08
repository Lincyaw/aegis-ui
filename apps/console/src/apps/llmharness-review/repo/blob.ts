import { apiFetch } from '../../../api/apiClient';
import { driverList, inlineUrl } from '../../../api/blobClient';
import { runPool } from '../../shared/runPool';
import { casesBlobRoot, sftBlobRoot } from '../connection';
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
import { caseSummary, parse } from '../validate';

import { isEmptySft, isNotFound, loadBundleViaRepo } from './bundle';
import type { CaseRepo, CaseSftBundle, SftRepo } from './types';

const META_CONCURRENCY = 8;

function rootLabel(bucket: string, prefix: string): string {
  return prefix ? `${bucket}/${prefix.replace(/\/$/, '')}` : bucket;
}

/** Reads objects of one bucket through the blob API's inline GETs. */
class BlobReader {
  readonly bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  source(key: string): string {
    return `${this.bucket}/${key}`;
  }

  async text(key: string): Promise<string> {
    const res = await apiFetch(inlineUrl(this.bucket, key));
    return res.text();
  }

  async optionalText(key: string): Promise<string | null> {
    try {
      return await this.text(key);
    } catch (err) {
      if (isNotFound(err)) {
        return null;
      }
      throw err;
    }
  }

  async rows<T>(
    key: string,
    parseRows: (source: string, text: string) => T[]
  ): Promise<T[]> {
    const text = await this.optionalText(key);
    return text === null ? [] : parseRows(this.source(key), text);
  }

  async sftDir(prefix: string): Promise<CaseSftBundle> {
    const [extractor, auditor, dropped] = await Promise.all([
      this.rows(`${prefix}extractor.jsonl`, parse.sftRows),
      this.rows(`${prefix}auditor.jsonl`, parse.sftRows),
      this.rows(`${prefix}dropped.jsonl`, parse.droppedRows),
    ]);
    return { extractor, auditor, dropped };
  }

  /** Child directories (`dirs`) or files (`files`) directly under `prefix`. */
  async children(prefix: string, kind: 'dirs' | 'files'): Promise<string[]> {
    const out: string[] = [];
    let token: string | undefined;
    do {
      const page = await driverList(this.bucket, {
        prefix,
        delimiter: '/',
        max_keys: 1000,
        continuation_token: token,
      });
      if (kind === 'dirs') {
        for (const cp of page.common_prefixes ?? []) {
          const rel = cp.slice(prefix.length).replace(/\/$/, '');
          if (rel) {
            out.push(rel);
          }
        }
      } else {
        for (const item of page.items) {
          const name = item.key.slice(prefix.length);
          if (name && !name.includes('/')) {
            out.push(name);
          }
        }
      }
      token = page.next_continuation_token;
    } while (token);
    return out;
  }
}

/** Reads cases out of aegis-blob under a user-supplied bucket and prefix. */
export class BlobCaseRepo implements CaseRepo {
  readonly label: string;
  readonly bucket: string;
  /** Directory prefix inside the bucket. Either empty or ends with '/'. */
  readonly prefix: string;
  private readonly reader: BlobReader;

  constructor(bucket: string, prefix: string) {
    this.bucket = bucket;
    this.prefix = prefix;
    this.label = rootLabel(bucket, prefix);
    this.reader = new BlobReader(bucket);
  }

  private keyFor(caseId: string, suffix: string): string {
    return `${this.prefix}${caseId}/${suffix}`;
  }

  async listCases(): Promise<CaseSummary[]> {
    const dirs = await this.reader.children(this.prefix, 'dirs');
    const settled = await runPool(
      dirs,
      META_CONCURRENCY,
      async (caseId): Promise<CaseSummary | null> => {
        const key = this.keyFor(caseId, 'meta.json');
        // Not every child directory is a case: only those with a meta.json.
        const text = await this.reader.optionalText(key);
        return text === null
          ? null
          : caseSummary(caseId, () =>
              parse.meta(this.reader.source(key), text)
            );
      }
    );
    const out: CaseSummary[] = [];
    for (const result of settled) {
      if (result.status === 'rejected') {
        throw result.reason;
      }
      if (result.value) {
        out.push(result.value);
      }
    }
    return out.sort((a, b) => a.caseId.localeCompare(b.caseId));
  }

  async readMeta(caseId: string): Promise<CaseMeta> {
    const key = this.keyFor(caseId, 'meta.json');
    return parse.meta(this.reader.source(key), await this.reader.text(key));
  }

  async readMainAgent(caseId: string): Promise<MainTurn[]> {
    const key = this.keyFor(caseId, 'main_agent.jsonl');
    return parse.mainTurns(
      this.reader.source(key),
      await this.reader.text(key)
    );
  }

  async listFiringFiles(caseId: string, phase: FiringPhase): Promise<string[]> {
    const names = await this.reader.children(
      this.keyFor(caseId, `${phase}/`),
      'files'
    );
    return names.filter((n) => n.endsWith('.json')).sort();
  }

  async readFiring(
    caseId: string,
    phase: FiringPhase,
    fileName: string
  ): Promise<ExtractorFiring | AuditorFiring> {
    const key = this.keyFor(caseId, `${phase}/${fileName}`);
    return parse.firing(
      this.reader.source(key),
      phase,
      await this.reader.text(key)
    );
  }

  async readSnapshot(
    caseId: string,
    sequence: number
  ): Promise<GraphSnapshot | null> {
    const padded = String(sequence).padStart(3, '0');
    const key = this.keyFor(
      caseId,
      `event_graph/after_extractor_${padded}.json`
    );
    const text = await this.reader.optionalText(key);
    return text === null ? null : parse.snapshot(this.reader.source(key), text);
  }

  loadBundle(caseId: string): Promise<CaseBundle> {
    return loadBundleViaRepo(this, caseId);
  }

  async loadSftForCase(caseId: string): Promise<CaseSftBundle | null> {
    const own = await this.reader.sftDir(this.keyFor(caseId, 'sft/'));
    return isEmptySft(own) ? null : own;
  }

  /** The `<prefix>sft/` files beside the cases, which hold the rows of every
   *  case; a case without its own sft/ takes its rows from here. */
  readSharedSft(): Promise<CaseSftBundle> {
    return this.reader.sftDir(`${this.prefix}sft/`);
  }
}

export class BlobSftRepo implements SftRepo {
  readonly label: string;
  readonly bucket: string;
  readonly prefix: string;
  private readonly reader: BlobReader;

  constructor(bucket: string, prefix: string) {
    this.bucket = bucket;
    this.prefix = prefix;
    this.label = rootLabel(bucket, prefix);
    this.reader = new BlobReader(bucket);
  }

  readExtractor = (): Promise<SftRow[]> =>
    this.reader.rows(`${this.prefix}extractor.jsonl`, parse.sftRows);
  readAuditor = (): Promise<SftRow[]> =>
    this.reader.rows(`${this.prefix}auditor.jsonl`, parse.sftRows);
  readDropped = (): Promise<DroppedRow[]> =>
    this.reader.rows(`${this.prefix}dropped.jsonl`, parse.droppedRows);
}

let blobCaseRepo: BlobCaseRepo | null = null;

/** The configured blob cases root, or null when none is set. The repo is
 *  kept while the root stays the same, so the queries keyed on it keep
 *  their cached rows from one page to the next. */
export function probeBlobCaseRepo(): BlobCaseRepo | null {
  const root = casesBlobRoot.get();
  if (!root) {
    return null;
  }
  if (
    blobCaseRepo?.bucket !== root.bucket ||
    blobCaseRepo.prefix !== root.prefix
  ) {
    blobCaseRepo = new BlobCaseRepo(root.bucket, root.prefix);
  }
  return blobCaseRepo;
}

export function probeBlobSftRepo(): BlobSftRepo | null {
  const root = sftBlobRoot.get();
  return root ? new BlobSftRepo(root.bucket, root.prefix) : null;
}
