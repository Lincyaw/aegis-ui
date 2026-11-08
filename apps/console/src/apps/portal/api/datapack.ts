import type {
  InjectionDatapackFilesResp,
  InjectionDatapackSchemaResp,
} from '@lincyaw/portal';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { type ArrowColumnInfo, arrowStreamToRows } from './arrow';
import { injectionsKeys } from './injections';
import { injectionsApi } from './portal-client';
import { required } from './response';

export const datapackKeys = {
  files: (id: number) => [...injectionsKeys.detail(id), 'datapack-files'],
  schema: (id: number) => [...injectionsKeys.detail(id), 'datapack-schema'],
};

export function useDatapackFiles(id: number | undefined) {
  return useQuery<InjectionDatapackFilesResp>({
    queryKey: datapackKeys.files(id ?? -1),
    enabled: id !== undefined,
    queryFn: async () => {
      const res = await injectionsApi.listDatapackFiles({ id: id ?? -1 });
      return required(res.data.data, 'datapack file list');
    },
  });
}

export function useDatapackSchema(id: number | undefined) {
  return useQuery<InjectionDatapackSchemaResp>({
    queryKey: datapackKeys.schema(id ?? -1),
    enabled: id !== undefined,
    queryFn: async () => {
      const res = await injectionsApi.getDatapackSchema({ id: id ?? -1 });
      return required(res.data.data, 'datapack schema');
    },
  });
}

export interface DatapackQueryResult {
  rows: Array<Record<string, unknown>>;
  columns: ArrowColumnInfo[];
  elapsedMs: number;
}

/**
 * Runs SQL over the datapack. The answer is an Arrow IPC stream, so the
 * body is read as bytes — and so is an error body, whose JSON message is
 * decoded here.
 */
export function useRunDatapackQuery(id: number) {
  return useMutation({
    mutationFn: async (sql: string): Promise<DatapackQueryResult> => {
      const startedAt = performance.now();
      try {
        const res = await injectionsApi.queryDatapack(
          { id, injectionDatapackQueryReq: { sql } },
          {
            responseType: 'arraybuffer',
            headers: { accept: 'application/vnd.apache.arrow.stream' },
          }
        );
        const body: unknown = res.data;
        if (!(body instanceof ArrayBuffer)) {
          throw new Error('The datapack query returned no Arrow stream.');
        }
        const parsed = arrowStreamToRows(new Uint8Array(body));
        return {
          ...parsed,
          elapsedMs: Math.round(performance.now() - startedAt),
        };
      } catch (err) {
        throw withServerMessage(err);
      }
    },
  });
}

function withServerMessage(err: unknown): unknown {
  if (!isAxiosError(err) || !(err.response?.data instanceof ArrayBuffer)) {
    return err;
  }
  const text = new TextDecoder().decode(err.response.data).trim();
  if (text === '') {
    return err;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'message' in parsed &&
      typeof parsed.message === 'string'
    ) {
      return new Error(parsed.message);
    }
  } catch (parseError) {
    if (!(parseError instanceof SyntaxError)) {
      throw parseError;
    }
  }
  return new Error(text);
}
