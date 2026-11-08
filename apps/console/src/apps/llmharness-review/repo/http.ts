import { ApiError, errMsg } from '../../../api/apiClient';
import { fetchHealth, getBackendUrl } from '../connection';
import type {
  AuditorFiring,
  CaseBundle,
  CaseMeta,
  CaseSummary,
  ExtractorFiring,
  FiringPhase,
  GraphSnapshot,
  MainTurn,
} from '../schemas';
import { parse, validate } from '../validate';

import { loadBundleViaRepo } from './bundle';
import { isNotFound } from './notFound';
import type { CaseRepo, CaseSftBundle } from './types';

/** Talks to `llmharness serve` on a user-configured URL. */
export class HttpCaseRepo implements CaseRepo {
  readonly label: string;
  private readonly base: string;

  constructor(baseUrl: string, label?: string) {
    this.base = baseUrl.replace(/\/+$/, '');
    this.label = label ?? new URL(this.base).host;
  }

  private casePath(caseId: string, rest: string): string {
    return `/api/cases/${encodeURIComponent(caseId)}/${rest}`;
  }

  private async getText(path: string): Promise<string> {
    const r = await fetch(`${this.base}${path}`);
    if (!r.ok) {
      throw new ApiError(
        r.status,
        null,
        `GET ${path} → ${r.status.toString()}`
      );
    }
    return r.text();
  }

  private async getJson(path: string): Promise<unknown> {
    return parse.json(`${this.base}${path}`, await this.getText(path));
  }

  async listCases(): Promise<CaseSummary[]> {
    const path = '/api/cases';
    return validate.caseList(`${this.base}${path}`, await this.getJson(path));
  }

  async readMeta(caseId: string): Promise<CaseMeta> {
    const path = this.casePath(caseId, 'meta');
    return validate.meta(`${this.base}${path}`, await this.getJson(path));
  }

  async readMainAgent(caseId: string): Promise<MainTurn[]> {
    const path = this.casePath(caseId, 'main_agent');
    return parse.mainTurns(`${this.base}${path}`, await this.getText(path));
  }

  async listFiringFiles(caseId: string, phase: FiringPhase): Promise<string[]> {
    const path = this.casePath(caseId, `firings/${phase}`);
    return validate.fileNames(`${this.base}${path}`, await this.getJson(path));
  }

  async readFiring(
    caseId: string,
    phase: FiringPhase,
    fileName: string
  ): Promise<ExtractorFiring | AuditorFiring> {
    const path = this.casePath(
      caseId,
      `firings/${phase}/${encodeURIComponent(fileName)}`
    );
    return validate.firing(
      `${this.base}${path}`,
      phase,
      await this.getJson(path)
    );
  }

  async readSnapshot(
    caseId: string,
    sequence: number
  ): Promise<GraphSnapshot | null> {
    const path = this.casePath(caseId, `snapshots/${sequence.toString()}`);
    let value: unknown;
    try {
      value = await this.getJson(path);
    } catch (err) {
      if (isNotFound(err)) {
        return null;
      }
      throw err;
    }
    return validate.snapshot(`${this.base}${path}`, value);
  }

  loadBundle(caseId: string): Promise<CaseBundle> {
    return loadBundleViaRepo(this, caseId);
  }

  async loadSftForCase(caseId: string): Promise<CaseSftBundle | null> {
    const path = this.casePath(caseId, 'sft');
    let value: unknown;
    try {
      value = await this.getJson(path);
    } catch (err) {
      if (isNotFound(err)) {
        return null;
      }
      throw err;
    }
    return validate.sftBundle(`${this.base}${path}`, value);
  }
}

/**
 * The configured `llmharness serve` backend, or null when no URL is set. A
 * configured backend that fails its health check rejects rather than falling
 * back to another source, so the review never shows data from somewhere the
 * user did not choose.
 */
export async function probeHttpCaseRepo(): Promise<HttpCaseRepo | null> {
  const url = getBackendUrl();
  if (!url) {
    return null;
  }
  try {
    const info = await fetchHealth(url);
    return new HttpCaseRepo(url, info.root);
  } catch (err) {
    throw new Error(
      `The llmharness backend at ${url} is not reachable (${errMsg(err)}). Fix or clear its URL in Settings.`
    );
  }
}
