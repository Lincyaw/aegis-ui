import { type ReactNode, useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './Terminal.css';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TerminalLine {
  ts?: string;
  prefix?: string;
  level?: LogLevel;
  body: ReactNode;
}

export interface TerminalSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (
    lines: TerminalLine[],
  ) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

interface TerminalProps {
  lines: TerminalLine[];
  ariaLabel?: string;
  className?: string;
  surface?: TerminalSurface;
}

export function Terminal({
  lines,
  ariaLabel = 'Experiment log',
  className,
  surface,
}: TerminalProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useAegisSurface<TerminalLine[]>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'terminal',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: lines,
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });
  const cls = ['aegis-terminal', className ?? ''].filter(Boolean).join(' ');
  return (
    <div
      ref={wrapRef}
      className={cls}
      role="log"
      aria-label={ariaLabel}
      aria-live="polite"
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      {lines.map((line, i) => (
        <div className="aegis-terminal__line" key={i}>
          {line.ts && <span className="aegis-terminal__ts">[{line.ts}]</span>}
          {line.prefix && (
            <span
              className={`aegis-terminal__prefix${line.level ? ` aegis-terminal__prefix--${line.level}` : ''}`}
            >
              {line.prefix}
            </span>
          )}
          <span className="aegis-terminal__body">{line.body}</span>
        </div>
      ))}
    </div>
  );
}

export default Terminal;
