import { tableFromIPC } from 'apache-arrow';

export interface ArrowColumnInfo {
  name: string;
  type: string;
}

export interface ArrowResult {
  rows: Array<Record<string, unknown>>;
  columns: ArrowColumnInfo[];
}

export function arrowStreamToRows(bytes: Uint8Array): ArrowResult {
  const table = tableFromIPC(bytes);
  const columns: ArrowColumnInfo[] = table.schema.fields.map((f) => ({
    name: f.name,
    type: String(f.type),
  }));
  const rows: Array<Record<string, unknown>> = [];
  for (const row of table) {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      obj[col.name] = normalizeCell(row[col.name]);
    }
    rows.push(obj);
  }
  return { rows, columns };
}

function normalizeCell(v: unknown): unknown {
  if (v === null || v === undefined) {
    return v;
  }
  if (typeof v === 'bigint') {
    if (v <= BigInt(Number.MAX_SAFE_INTEGER) && v >= BigInt(Number.MIN_SAFE_INTEGER)) {
      return Number(v);
    }
    return v.toString();
  }
  if (v instanceof Date) {
    return v.toISOString();
  }
  if (v instanceof Uint8Array) {
    return `[bytes ${String(v.byteLength)}]`;
  }
  if (typeof v === 'object') {
    const proto = Object.getPrototypeOf(v) as object | null;
    if (proto && proto !== Object.prototype) {
      try {
        return JSON.parse(JSON.stringify(v));
      } catch {
        return String(v);
      }
    }
  }
  return v;
}
