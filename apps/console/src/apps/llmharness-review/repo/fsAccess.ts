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

export interface DirectoryHandle {
  kind: 'directory';
  name: string;
  values(): AsyncIterable<DirectoryHandle | FileHandle>;
  getDirectoryHandle(name: string): Promise<DirectoryHandle>;
  getFileHandle(name: string): Promise<FileHandle>;
}

interface FileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

async function readText(dir: DirectoryHandle, name: string): Promise<string> {
  const file = await (await dir.getFileHandle(name)).getFile();
  return file.text();
}

async function readOptionalText(
  dir: DirectoryHandle,
  name: string
): Promise<string | null> {
  try {
    return await readText(dir, name);
  } catch (err) {
    if (isNotFound(err)) {
      return null;
    }
    throw err;
  }
}

async function optionalDir(
  dir: DirectoryHandle,
  name: string
): Promise<DirectoryHandle | null> {
  try {
    return await dir.getDirectoryHandle(name);
  } catch (err) {
    if (isNotFound(err)) {
      return null;
    }
    throw err;
  }
}

async function readSftDir(
  dir: DirectoryHandle,
  source: string
): Promise<CaseSftBundle> {
  const [extractor, auditor, dropped] = await Promise.all([
    readOptionalText(dir, 'extractor.jsonl'),
    readOptionalText(dir, 'auditor.jsonl'),
    readOptionalText(dir, 'dropped.jsonl'),
  ]);
  return {
    extractor: extractor
      ? parse.sftRows(`${source}/extractor.jsonl`, extractor)
      : [],
    auditor: auditor ? parse.sftRows(`${source}/auditor.jsonl`, auditor) : [],
    dropped: dropped
      ? parse.droppedRows(`${source}/dropped.jsonl`, dropped)
      : [],
  };
}

export class FSAccessCaseRepo implements CaseRepo {
  readonly label: string;
  private readonly root: DirectoryHandle;

  constructor(root: DirectoryHandle) {
    this.root = root;
    this.label = root.name;
  }

  private caseDir(caseId: string): Promise<DirectoryHandle> {
    return this.root.getDirectoryHandle(caseId);
  }

  private source(...parts: string[]): string {
    return [this.label, ...parts].join('/');
  }

  async listCases(): Promise<CaseSummary[]> {
    const out: CaseSummary[] = [];
    for await (const entry of this.root.values()) {
      if (entry.kind !== 'directory') {
        continue;
      }
      // Not every child directory is a case: only those with a meta.json.
      const text = await readOptionalText(entry, 'meta.json');
      if (text !== null) {
        out.push(
          caseSummary(entry.name, () =>
            parse.meta(this.source(entry.name, 'meta.json'), text)
          )
        );
      }
    }
    out.sort((a, b) => a.caseId.localeCompare(b.caseId));
    return out;
  }

  async readMeta(caseId: string): Promise<CaseMeta> {
    const dir = await this.caseDir(caseId);
    return parse.meta(
      this.source(caseId, 'meta.json'),
      await readText(dir, 'meta.json')
    );
  }

  async readMainAgent(caseId: string): Promise<MainTurn[]> {
    const dir = await this.caseDir(caseId);
    return parse.mainTurns(
      this.source(caseId, 'main_agent.jsonl'),
      await readText(dir, 'main_agent.jsonl')
    );
  }

  async listFiringFiles(caseId: string, phase: FiringPhase): Promise<string[]> {
    const phaseDir = await optionalDir(await this.caseDir(caseId), phase);
    if (!phaseDir) {
      return [];
    }
    const names: string[] = [];
    for await (const entry of phaseDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        names.push(entry.name);
      }
    }
    return names.sort();
  }

  async readFiring(
    caseId: string,
    phase: FiringPhase,
    fileName: string
  ): Promise<ExtractorFiring | AuditorFiring> {
    const phaseDir = await (
      await this.caseDir(caseId)
    ).getDirectoryHandle(phase);
    return parse.firing(
      this.source(caseId, phase, fileName),
      phase,
      await readText(phaseDir, fileName)
    );
  }

  async readSnapshot(
    caseId: string,
    extractorSequence: number
  ): Promise<GraphSnapshot | null> {
    const snapDir = await optionalDir(
      await this.caseDir(caseId),
      'event_graph'
    );
    if (!snapDir) {
      return null;
    }
    const name = `after_extractor_${String(extractorSequence).padStart(3, '0')}.json`;
    const text = await readOptionalText(snapDir, name);
    return text === null
      ? null
      : parse.snapshot(this.source(caseId, 'event_graph', name), text);
  }

  loadBundle(caseId: string): Promise<CaseBundle> {
    return loadBundleViaRepo(this, caseId);
  }

  async loadSftForCase(caseId: string): Promise<CaseSftBundle | null> {
    const sftDir = await optionalDir(await this.caseDir(caseId), 'sft');
    if (!sftDir) {
      return null;
    }
    const sft = await readSftDir(sftDir, this.source(caseId, 'sft'));
    return isEmptySft(sft) ? null : sft;
  }
}

export class FSAccessSftRepo implements SftRepo {
  readonly label: string;
  private readonly root: DirectoryHandle;

  constructor(root: DirectoryHandle) {
    this.root = root;
    this.label = root.name;
  }

  private async rows<T>(
    name: string,
    parseRows: (source: string, text: string) => T[]
  ): Promise<T[]> {
    const text = await readOptionalText(this.root, name);
    return text === null ? [] : parseRows(`${this.label}/${name}`, text);
  }

  readExtractor = (): Promise<SftRow[]> =>
    this.rows('extractor.jsonl', parse.sftRows);
  readAuditor = (): Promise<SftRow[]> =>
    this.rows('auditor.jsonl', parse.sftRows);
  readDropped = (): Promise<DroppedRow[]> =>
    this.rows('dropped.jsonl', parse.droppedRows);
}
