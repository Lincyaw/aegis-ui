import { useRef, useState } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import { Chip } from './Chip';
import { MetricLabel } from './MetricLabel';
import './ToolCallCard.css';

export type ToolCallStatus = 'running' | 'ok' | 'error';

export interface ToolCallData {
  name: string;
  arguments: string;
  result?: string;
  status?: ToolCallStatus;
  isError?: boolean;
}

export interface ToolCallCardSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (data: ToolCallData) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

interface ToolCallCardProps {
  data: ToolCallData;
  className?: string;
  surface?: ToolCallCardSurface;
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [folded, setFolded] = useState(true);
  const lines = code.split('\n');
  const preview = lines.slice(0, 3).join('\n');
  const showExpand = lines.length > 3;

  return (
    <div className="aegis-tool-call__code">
      <button
        type="button"
        className="aegis-tool-call__code-label"
        onClick={() => setFolded((f) => !f)}
        aria-expanded={!folded}
      >
        <MetricLabel size="xs">{label}</MetricLabel>
        {showExpand && (
          <span className="aegis-tool-call__fold-indicator">
            {folded ? '▸' : '▾'}
          </span>
        )}
      </button>
      <pre className="aegis-tool-call__code-body">
        <code>{folded && showExpand ? preview : code}</code>
      </pre>
    </div>
  );
}

export function ToolCallCard({ data, className, surface }: ToolCallCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useAegisSurface<ToolCallData>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'detail',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data,
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const status: ToolCallStatus = data.status ?? 'ok';
  const cls = ['aegis-tool-call', `aegis-tool-call--${status}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={wrapRef}
      className={cls}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      <div className="aegis-tool-call__head">
        <Chip tone="ink">{data.name}</Chip>
        <StatusChip status={status} />
      </div>
      <CodeBlock label="arguments" code={data.arguments} />
      {data.result && (
        <CodeBlock
          label={status === 'error' ? 'error' : 'result'}
          code={data.result}
        />
      )}
    </div>
  );
}

function StatusChip({ status }: { status: ToolCallStatus }) {
  if (status === 'running') {
    return (
      <span className="aegis-tool-call__status aegis-tool-call__status--running">
        <span className="aegis-tool-call__spinner" aria-hidden="true" />
        running
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="aegis-tool-call__status aegis-tool-call__status--error">
        error
      </span>
    );
  }
  return (
    <span className="aegis-tool-call__status aegis-tool-call__status--ok">
      ok
    </span>
  );
}

export default ToolCallCard;
