import { type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/usePrimitiveSurface';
import './Terminal.css';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TerminalLine {
  ts?: string;
  prefix?: string;
  level?: LogLevel;
  body: ReactNode;
}

export type TerminalSurface = PrimitiveSurface<TerminalLine[]>;

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
  const agentAttrs = usePrimitiveSurface(surface, lines, 'terminal', wrapRef);
  const cls = ['aegis-terminal', className ?? ''].filter(Boolean).join(' ');
  return (
    <div
      ref={wrapRef}
      className={cls}
      role="log"
      aria-label={ariaLabel}
      aria-live="polite"
      {...agentAttrs}
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
