import { type CSSProperties, useEffect, useMemo, useState } from 'react';

import {
  type AsyncBuffer,
  type FileMetaData,
  asyncBufferFromUrl,
  parquetMetadataAsync,
  parquetReadObjects,
  toJson,
} from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

import { Chip } from './Chip';
import { DataTable, type DataTableColumn } from './DataTable';
import './ParquetViewer.css';

interface ParquetViewerProps {
  /** Local file (e.g. from FileDropzone). Takes precedence over `src`. */
  file?: File | Blob;
  /** Remote URL — must support range requests. */
  src?: string;
  /** Rows per page. */
  pageSize?: number;
  /** Header above the table. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

interface ColumnSpec {
  name: string;
  type: string;
}

interface MetaSummary {
  buffer: AsyncBuffer;
  metadata: FileMetaData;
  columns: ColumnSpec[];
  totalRows: number;
}

type Row = Record<string, unknown>;

function asyncBufferFromBlob(blob: Blob): AsyncBuffer {
  return {
    byteLength: blob.size,
    slice(start, end) {
      return blob.slice(start, end).arrayBuffer();
    },
  };
}

function describeType(name: string, type: string | undefined): ColumnSpec {
  return { name, type: type ?? '—' };
}

function buildColumns(meta: FileMetaData): ColumnSpec[] {
  return meta.schema
    .filter((s) => s.type !== undefined)
    .map((s) => describeType(s.name, s.type));
}

function totalRowsOf(meta: FileMetaData): number {
  const n = meta.num_rows;
  return typeof n === 'bigint' ? Number(n) : n;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(toJson(value));
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function ParquetViewer({
  file,
  src,
  pageSize = 50,
  title,
  className,
  style,
}: ParquetViewerProps) {
  const [meta, setMeta] = useState<MetaSummary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMeta(null);
    setRows([]);
    setPage(0);
    setError(null);
    if (!file && !src) {
      return;
    }
    setLoading(true);
    const state = { cancelled: false };
    void (async () => {
      try {
        const buffer = file
          ? asyncBufferFromBlob(file)
          : await asyncBufferFromUrl({ url: src ?? '' });
        const metadata = await parquetMetadataAsync(buffer);
        if (state.cancelled) {
          return;
        }
        setMeta({
          buffer,
          metadata,
          columns: buildColumns(metadata),
          totalRows: totalRowsOf(metadata),
        });
      } catch (e) {
        if (state.cancelled) {
          return;
        }
        setError(e instanceof Error ? e.message : 'failed to read parquet');
      } finally {
        if (!state.cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      state.cancelled = true;
    };
  }, [file, src]);

  useEffect(() => {
    if (!meta) {
      return;
    }
    const state = { cancelled: false };
    setLoading(true);
    const rowStart = page * pageSize;
    const rowEnd = Math.min(rowStart + pageSize, meta.totalRows);
    void (async () => {
      try {
        const result = await parquetReadObjects({
          file: meta.buffer,
          metadata: meta.metadata,
          rowStart,
          rowEnd,
          compressors,
        });
        if (state.cancelled) {
          return;
        }
        setRows(result);
      } catch (e) {
        if (state.cancelled) {
          return;
        }
        setError(e instanceof Error ? e.message : 'failed to read rows');
      } finally {
        if (!state.cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      state.cancelled = true;
    };
  }, [meta, page, pageSize]);

  const tableColumns = useMemo<Array<DataTableColumn<Row>>>(() => {
    if (!meta) {
      return [];
    }
    return meta.columns.map(
      (c): DataTableColumn<Row> => ({
        key: c.name,
        header: (
          <span className="aegis-parquet-viewer__col-header">
            <span className="aegis-parquet-viewer__col-name">{c.name}</span>
            <span className="aegis-parquet-viewer__col-type">{c.type}</span>
          </span>
        ),
        minWidth: 120,
        resizable: true,
        render: (row) => (
          <span className="aegis-parquet-viewer__cell">
            {formatCell(row[c.name])}
          </span>
        ),
      }),
    );
  }, [meta]);

  const totalPages = meta
    ? Math.max(1, Math.ceil(meta.totalRows / pageSize))
    : 0;
  const rootClass = ['aegis-parquet-viewer', className ?? '']
    .filter(Boolean)
    .join(' ');

  if (!file && !src) {
    return (
      <div className={rootClass} style={style}>
        <div className="aegis-parquet-viewer__empty">
          No parquet source — pass a `file` or `src` URL to inspect.
        </div>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className={rootClass} style={style}>
        <div className="aegis-parquet-viewer__error">{error}</div>
      </div>
    );
  }

  return (
    <div className={rootClass} style={style}>
      <header className="aegis-parquet-viewer__header">
        <div className="aegis-parquet-viewer__title">{title ?? 'Parquet'}</div>
        {meta ? (
          <div className="aegis-parquet-viewer__summary">
            <span>{meta.totalRows.toLocaleString()} rows</span>
            <span className="aegis-parquet-viewer__dot">·</span>
            <span>{meta.columns.length} cols</span>
            {meta.metadata.created_by ? (
              <>
                <span className="aegis-parquet-viewer__dot">·</span>
                <span className="aegis-parquet-viewer__created-by">
                  {meta.metadata.created_by}
                </span>
              </>
            ) : null}
          </div>
        ) : null}
      </header>
      {meta ? (
        <div className="aegis-parquet-viewer__schema">
          {meta.columns.map((c) => (
            <Chip key={c.name} tone="ghost">
              <span className="aegis-parquet-viewer__chip-name">{c.name}</span>
              <span className="aegis-parquet-viewer__chip-type">{c.type}</span>
            </Chip>
          ))}
        </div>
      ) : null}
      <div className="aegis-parquet-viewer__table">
        <DataTable<Row>
          columns={tableColumns}
          data={rows}
          rowKey={(_row, i) => `${page.toString()}-${i.toString()}`}
          loading={loading}
          emptyTitle="No rows in this page"
        />
      </div>
      {meta && totalPages > 1 ? (
        <footer className="aegis-parquet-viewer__pager">
          <button
            type="button"
            className="aegis-parquet-viewer__page-btn"
            onClick={() => {
              setPage((p) => Math.max(0, p - 1));
            }}
            disabled={page === 0 || loading}
          >
            ← Prev
          </button>
          <span className="aegis-parquet-viewer__page-label">
            Page {(page + 1).toString()} / {totalPages.toString()}
          </span>
          <button
            type="button"
            className="aegis-parquet-viewer__page-btn"
            onClick={() => {
              setPage((p) => Math.min(totalPages - 1, p + 1));
            }}
            disabled={page >= totalPages - 1 || loading}
          >
            Next →
          </button>
        </footer>
      ) : null}
    </div>
  );
}

export default ParquetViewer;
