import './StatusDot.css';

interface StatusDotProps {
  pulse?: boolean;
  /**
   * Fill colour. `warning` is the anomaly red, for failures only; `caution`
   * is `--ink-warn`, for what needs attention but has not failed.
   */
  tone?: 'ink' | 'inverted' | 'warning' | 'caution' | 'muted' | 'success';
  size?: number;
  className?: string;
}

export function StatusDot({
  pulse = false,
  tone = 'ink',
  size = 6,
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
  return (
    <span
      className={cls}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
