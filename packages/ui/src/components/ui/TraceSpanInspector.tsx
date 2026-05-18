import type { ReactNode } from 'react';

import { Chip } from './Chip';
import { CodeBlock } from './CodeBlock';
import { EmptyState } from './EmptyState';
import { type KeyValueItem, KeyValueList } from './KeyValueList';
import { MonoValue } from './MonoValue';
import { ObjectInspector, type ObjectInspectorTab } from './ObjectInspector';
import { StatusDot } from './StatusDot';
import type { TraceSpan } from './TraceTree';

export interface TraceSpanInspectorProps {
  span: TraceSpan | null;
  onClose: () => void;
  /** Optional resolver to render related spans (parent + children) as clickable refs. */
  spanLookup?: (id: string) => TraceSpan | undefined;
  /** Called when a related span is clicked. */
  onSelectRelated?: (span: TraceSpan) => void;
  /** Optional raw OTel attributes from the original span row (for the Raw tab JSON). */
  raw?: unknown;
}

const TITLE_MAX = 80;

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}...`;
}

function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(ms < 10 ? 1 : 0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusTone(status?: TraceSpan['status']): 'warning' | 'ink' | 'muted' {
  if (status === 'error') {
    return 'warning';
  }
  if (status === 'ok') {
    return 'ink';
  }
  return 'muted';
}

function stripFnRefs(span: TraceSpan): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: span.id,
    parentId: span.parentId,
    name: span.name,
    startMs: span.startMs,
    durationMs: span.durationMs,
    status: span.status,
  };
  if (typeof span.kind === 'string' || typeof span.kind === 'number') {
    out.kind = span.kind;
  }
  return out;
}

function nodeToString(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  return '';
}

export function TraceSpanInspector({
  span,
  onClose,
  spanLookup,
  onSelectRelated,
  raw,
}: TraceSpanInspectorProps) {
  if (!span) {
    return (
      <ObjectInspector
        open={false}
        onClose={onClose}
        title=""
        tabs={[{ id: 'overview', label: 'Overview', content: null }]}
      />
    );
  }

  const parent =
    span.parentId && spanLookup ? spanLookup(span.parentId) : undefined;

  const overviewItems: KeyValueItem[] = [
    {
      k: 'name',
      v: <span style={{ fontFamily: 'var(--font-mono)' }}>{span.name}</span>,
    },
    {
      k: 'status',
      v: (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <StatusDot tone={statusTone(span.status)} size={6} />
          {span.status ?? 'unset'}
        </span>
      ),
    },
  ];

  if (
    span.kind !== undefined &&
    span.kind !== null &&
    nodeToString(span.kind) !== ''
  ) {
    overviewItems.push({
      k: 'kind',
      v: <Chip tone="ghost">{span.kind}</Chip>,
    });
  }

  overviewItems.push(
    {
      k: 'start',
      v: <MonoValue size="sm">{formatDuration(span.startMs)}</MonoValue>,
    },
    {
      k: 'duration',
      v: <MonoValue size="sm">{formatDuration(span.durationMs)}</MonoValue>,
    },
  );

  if (parent && onSelectRelated) {
    const parentSpan = parent;
    overviewItems.push({
      k: 'parent',
      v: (
        <button
          type="button"
          onClick={() => {
            onSelectRelated(parentSpan);
          }}
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            color: 'var(--text-link, var(--text-main))',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            textDecoration: 'underline',
          }}
        >
          {parent.name}
        </button>
      ),
    });
  } else if (span.parentId) {
    overviewItems.push({
      k: 'parent',
      v: <MonoValue size="sm">{span.parentId}</MonoValue>,
    });
  }

  overviewItems.push({
    k: 'id',
    v: <MonoValue size="sm">{span.id}</MonoValue>,
  });

  const attrEntries = span.attrs ? Object.entries(span.attrs) : [];
  const attrItems: KeyValueItem[] = attrEntries.map(([k, v]) => ({
    k,
    v: (
      <MonoValue size="sm">
        {typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
          ? String(v)
          : JSON.stringify(v)}
      </MonoValue>
    ),
  }));

  let rawJson = '{}';
  try {
    rawJson = JSON.stringify(
      raw ?? { span: stripFnRefs(span), attrs: span.attrs },
      null,
      2,
    );
  } catch {
    rawJson = '{}';
  }

  const tabs: ObjectInspectorTab[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: <KeyValueList items={overviewItems} />,
    },
    {
      id: 'attributes',
      label: 'Attributes',
      content:
        attrItems.length > 0 ? (
          <KeyValueList items={attrItems} />
        ) : (
          <EmptyState
            title="No attributes"
            description="No attributes recorded on this span."
          />
        ),
    },
    {
      id: 'raw',
      label: 'Raw',
      content: <CodeBlock code={rawJson} language="json" />,
    },
  ];

  return (
    <ObjectInspector
      open
      onClose={onClose}
      title={truncate(span.name, TITLE_MAX)}
      subtitle={nodeToString(span.kind) || undefined}
      tabs={tabs}
    />
  );
}

export default TraceSpanInspector;
