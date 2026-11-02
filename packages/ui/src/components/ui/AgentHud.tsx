import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { type ChartColor, chartColorValue } from '../../lib/chart';
import './AgentHud.css';

export interface AgentHudMeter {
  key: string;
  label: ReactNode;
  /** The meter's reading, e.g. "14 / 20". */
  value: ReactNode;
  /** How full the meter is, 0 to 1. */
  share: number;
}

export interface AgentHudProps {
  /** Who is playing, usually a `SeriesLabel`. */
  agent: ReactNode;
  score: ReactNode;
  meters: AgentHudMeter[];
  /** What the agent is doing now, e.g. "思考中 · 已用 2.4 s / 10 s". */
  status?: ReactNode;
  /** The agent's colour, the same as its pieces on the board. */
  color: ChartColor;
  className?: string;
}

/** One side's state during a game replay. It is glass, so it can lie over the board. */
export function AgentHud({
  agent,
  score,
  meters,
  status,
  color,
  className,
}: AgentHudProps): ReactElement {
  return (
    <div
      className={['aegis-agent-hud', className ?? ''].filter(Boolean).join(' ')}
      style={
        { '--aegis-agent-hud-color': chartColorValue(color) } as CSSProperties
      }
    >
      <div className="aegis-agent-hud__head">
        <span className="aegis-agent-hud__agent">{agent}</span>
        <span className="aegis-agent-hud__score">{score}</span>
      </div>
      {meters.map((meter) => (
        <div key={meter.key} className="aegis-agent-hud__meter">
          <div className="aegis-agent-hud__reading">
            <span className="aegis-agent-hud__label">{meter.label}</span>
            <span className="aegis-agent-hud__value">{meter.value}</span>
          </div>
          <div className="aegis-agent-hud__track">
            <div
              className="aegis-agent-hud__fill"
              style={{
                width: `${(Math.min(Math.max(meter.share, 0), 1) * 100).toString()}%`,
              }}
            />
          </div>
        </div>
      ))}
      {status !== undefined && (
        <p className="aegis-agent-hud__status">{status}</p>
      )}
    </div>
  );
}
