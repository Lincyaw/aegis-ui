import type { InjectionDatapackFilesResp } from '@lincyaw/portal';
import axios, { type AxiosError } from 'axios';

import { getRuntimeConfig } from '../../../config/runtime';

import { injectionsApi, portalAxios } from './portal-client';
import { arrowStreamToRows, type ArrowResult } from '../pages/InjectionData/arrowToRows';

export interface DatapackColumn {
  name: string;
  type: string;
}

export interface DatapackTable {
  name: string;
  columns: DatapackColumn[];
}

export interface DatapackSchema {
  tables: DatapackTable[];
}

export class DatapackQueryError extends Error {
  status?: number;
  isBackendMissing: boolean;

  constructor(message: string, opts: { status?: number; isBackendMissing?: boolean } = {}) {
    super(message);
    this.name = 'DatapackQueryError';
    this.status = opts.status;
    this.isBackendMissing = opts.isBackendMissing ?? false;
  }
}

function gatewayBase(): string {
  return getRuntimeConfig().gatewayUrl;
}

export async function listDatapackFiles(
  id: number,
): Promise<InjectionDatapackFilesResp> {
  const res = await injectionsApi.listDatapackFiles({ id });
  return res.data.data ?? { files: [], dir_count: 0, file_count: 0 };
}

export async function getDatapackSchema(id: number): Promise<DatapackSchema> {
  try {
    const res = await portalAxios.get<{ data?: DatapackSchema } | DatapackSchema>(
      `${gatewayBase()}/api/v2/injections/${String(id)}/datapack-schema`,
    );
    const body = res.data as { data?: DatapackSchema } & DatapackSchema;
    if (body.tables) {
      return { tables: body.tables };
    }
    if (body.data?.tables) {
      return body.data;
    }
    return { tables: [] };
  } catch (err) {
    throw wrapAxiosError(err, 'Failed to load datapack schema');
  }
}

export interface DatapackQueryResult {
  rows: Array<Record<string, unknown>>;
  columns: ArrowResult['columns'];
  elapsedMs: number;
}

export async function runDatapackQuery(
  id: number,
  sql: string,
): Promise<DatapackQueryResult> {
  const startedAt = performance.now();
  try {
    const res = await portalAxios.post<ArrayBuffer>(
      `${gatewayBase()}/api/v2/injections/${String(id)}/datapack-query`,
      { sql },
      {
        responseType: 'arraybuffer',
        headers: {
          'content-type': 'application/json',
          accept: 'application/vnd.apache.arrow.stream',
        },
      },
    );
    const contentType = String(res.headers['content-type'] ?? '');
    if (!contentType.includes('arrow')) {
      const text = decodeMaybeJson(res.data);
      throw new DatapackQueryError(
        text ?? 'Backend returned non-Arrow response',
        { status: res.status, isBackendMissing: true },
      );
    }
    const parsed = arrowStreamToRows(new Uint8Array(res.data));
    return {
      rows: parsed.rows,
      columns: parsed.columns,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
  } catch (err) {
    if (err instanceof DatapackQueryError) {
      throw err;
    }
    throw wrapAxiosError(err, 'Datapack query failed');
  }
}

function decodeMaybeJson(buf: ArrayBuffer): string | undefined {
  try {
    const text = new TextDecoder().decode(buf);
    if (text.trim().length === 0) {
      return undefined;
    }
    return text;
  } catch {
    return undefined;
  }
}

function wrapAxiosError(err: unknown, fallback: string): DatapackQueryError {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<unknown>;
    const status = ax.response?.status;
    const backendMissing = status === 404 || status === 501;
    let message = fallback;
    const data: unknown = ax.response?.data;
    if (data instanceof ArrayBuffer) {
      const text = decodeMaybeJson(data);
      if (text) {
        message = text;
      }
    } else if (typeof data === 'string' && data.length > 0) {
      message = data;
    } else if (
      data !== null &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
    ) {
      message = (data as { message: string }).message;
    } else if (ax.message) {
      message = ax.message;
    }
    return new DatapackQueryError(message, { status, isBackendMissing: backendMissing });
  }
  if (err instanceof Error) {
    return new DatapackQueryError(err.message);
  }
  return new DatapackQueryError(fallback);
}
