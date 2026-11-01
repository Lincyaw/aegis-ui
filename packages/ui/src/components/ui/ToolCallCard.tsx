import { useRef, useState } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import { useStrings } from '../../locale';
import { Chip } from './Chip';
import { MetricLabel } from './MetricLabel';
import './ToolCallCard.css';

export type ToolCallStatus = 'running' | 'ok' | 'error';

export interface ToolCallData {
  name: string;
  arguments: string;
  result?: string;
  status?: ToolCallStatus;
}

export type ToolCallCardSurface = PrimitiveSurface<ToolCallData>;

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
  const agentAttrs = usePrimitiveSurface(surface, data, 'detail', wrapRef);
  const strings = useStrings();
  const status: ToolCallStatus = data.status ?? 'ok';
  const cls = ['aegis-tool-call', `aegis-tool-call--${status}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={wrapRef} className={cls} {...agentAttrs}>
      <div className="aegis-tool-call__head">
        <Chip tone="ink">{data.name}</Chip>
        <StatusChip status={status} />
      </div>
      <CodeBlock label={strings.toolCallArguments} code={data.arguments} />
      {data.result && (
        <CodeBlock
          label={
            status === 'error' ? strings.toolCallError : strings.toolCallResult
          }
          code={data.result}
        />
      )}
    </div>
  );
}

function StatusChip({ status }: { status: ToolCallStatus }) {
  const strings = useStrings();
  if (status === 'running') {
    return (
      <span className="aegis-tool-call__status aegis-tool-call__status--running">
        <span className="aegis-tool-call__spinner" aria-hidden="true" />
        {strings.toolCallStatus('running')}
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="aegis-tool-call__status aegis-tool-call__status--error">
        {strings.toolCallStatus('error')}
      </span>
    );
  }
  return (
    <span className="aegis-tool-call__status aegis-tool-call__status--ok">
      {strings.toolCallStatus('ok')}
    </span>
  );
}
