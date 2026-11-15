import './StatusDot.css';

interface StatusDotProps {
  pulse?: boolean;
  /**
   * Fill colour. `warning` is the anomaly red, for failures only; `caution`
   * is `--ink-warn`, for what needs attention but has not failed; `info`
   * is the link blue, for what is current or in progress.
   */
  tone?:
    | 'ink'
    | 'inverted'
    | 'warning'
    | 'caution'
    | 'info'
    | 'muted'
    | 'success';
  /** Diameter in px; defaults to `--status-dot-size`. */
  size?: number;
  /**
   * The state the dot stands for, as text that assistive technology and a
   * page's text read but that is not drawn, for a dot shown without its
   * word, e.g. in a row of dots or beside an event.
   */
  label?: string;
  className?: string;
}

export function StatusDot({
  pulse = false,
  tone = 'ink',
  size,
  label,
  className,
}: StatusDotProps) {
  const cls = [
    'aegis-status-dot',
    `aegis-status-dot--${tone}`,
    pulse ? 'aegis-status-dot--pulse' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const dot = (
    <span
      className={cls}
      style={size === undefined ? undefined : { width: size, height: size }}
      aria-hidden="true"
    />
  );
  if (label === undefined) {
    return dot;
  }
  return (
    <span className="aegis-status-dot-labelled">
      {dot}
      <span className="aegis-status-dot-labelled__label">{label}</span>
    </span>
  );
}
