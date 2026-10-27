import type { ReactNode } from 'react';

import { useStrings } from '../../locale';
import { Chip } from './Chip';
import { CodeBlock } from './CodeBlock';
import { EmptyState } from './EmptyState';
import { type KeyValueItem, KeyValueList } from './KeyValueList';
import { MonoValue } from './MonoValue';
import { ObjectInspector, type ObjectInspectorTab } from './ObjectInspector';
import { StatusDot } from './StatusDot';
import './TraceSpanInspector.css';
import type { TraceSpan } from './TraceTree';
import { formatDuration, nodeToString, statusTone } from './traceFormat';

export interface TraceSpanInspectorProps {
  span: TraceSpan | null;
  onClose: () => void;
  /** Optional resolver to render related spans (parent + children) as clickable refs. */
  spanLookup?: (id: string) => TraceSpan | undefined;
  /** Called when a related span is clicked. */
  onSelectRelated?: (span: TraceSpan) => void;
  /** Optional raw OTel attributes from the original span row (for the Raw tab JSON). */
  raw?: unknown;
  /** The span's content, shown in the Overview tab under its facts. */
  detail?: ReactNode;
}

const TITLE_MAX = 80;

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}...`;
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

export function TraceSpanInspector({
  span,
  onClose,
  spanLookup,
  onSelectRelated,
  raw,
  detail,
}: TraceSpanInspectorProps) {
  const strings = useStrings();
  if (!span) {
    return (
      <ObjectInspector
        open={false}
        onClose={onClose}
        title=""
        tabs={[
          { id: 'overview', label: strings.inspectorOverview, content: null },
        ]}
      />
    );
  }

  const parent =
    span.parentId && spanLookup ? spanLookup(span.parentId) : undefined;

  const overviewItems: KeyValueItem[] = [
    {
      k: strings.traceSpanField('name'),
      v: <span className="aegis-trace-span-inspector__name">{span.name}</span>,
    },
    {
      k: strings.traceSpanField('status'),
      v: (
        <span className="aegis-trace-span-inspector__status">
          <StatusDot tone={statusTone(span.status)} size={6} />
          {strings.traceSpanStatus(span.status ?? 'unset')}
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
      k: strings.traceSpanField('kind'),
      v: <Chip tone="ghost">{span.kind}</Chip>,
    });
  }

  if (span.startMs !== undefined) {
    overviewItems.push({
      k: strings.traceSpanField('start'),
      v: <MonoValue size="sm">{formatDuration(span.startMs)}</MonoValue>,
    });
  }
  if (span.durationMs !== undefined) {
    overviewItems.push({
      k: strings.traceSpanField('duration'),
      v: <MonoValue size="sm">{formatDuration(span.durationMs)}</MonoValue>,
    });
  }

  if (parent && onSelectRelated) {
    const parentSpan = parent;
    overviewItems.push({
      k: strings.traceSpanField('parent'),
      v: (
        <button
          type="button"
          onClick={() => {
            onSelectRelated(parentSpan);
          }}
          className="aegis-trace-span-inspector__parent-link"
        >
          {parent.name}
        </button>
      ),
    });
  } else if (span.parentId) {
    overviewItems.push({
      k: strings.traceSpanField('parent'),
      v: <MonoValue size="sm">{span.parentId}</MonoValue>,
    });
  }

  overviewItems.push({
    k: strings.traceSpanField('id'),
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
      label: strings.inspectorOverview,
      content:
        detail === undefined ? (
          <KeyValueList items={overviewItems} />
        ) : (
          <div className="aegis-trace-span-inspector__overview">
            <KeyValueList items={overviewItems} />
            <div className="aegis-trace-span-inspector__detail">{detail}</div>
          </div>
        ),
    },
    {
      id: 'attributes',
      label: strings.inspectorAttributes,
      content:
        attrItems.length > 0 ? (
          <KeyValueList items={attrItems} />
        ) : (
          <EmptyState
            title={strings.noAttributes}
            description={strings.noAttributesDescription}
          />
        ),
    },
    {
      id: 'raw',
      label: strings.inspectorRaw,
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
