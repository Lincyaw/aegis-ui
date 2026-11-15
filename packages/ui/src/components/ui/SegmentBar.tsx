import './SegmentBar.css';

export interface SegmentBarGroup {
  key: string;
  /**
   * `success` for passed, `warning` (the anomaly red) for failed,
   * `caution` for what needs attention, `info` for what is in progress,
   * `muted` for what has not started.
   */
  tone: 'success' | 'warning' | 'caution' | 'info' | 'muted';
  /** How many segments the group draws, one per item. */
  count: number;
  /** The group as text, e.g. 通过 2: read, not drawn. */
  label: string;
}

interface SegmentBarProps {
  /** The groups, drawn left to right in this order. */
  groups: SegmentBarGroup[];
  className?: string;
}

/**
 * A row of short bars, one per item, coloured by each item's state: the
 * progress of a few items at a glance, e.g. a run's areas. Each group's
 * label is text that assistive technology and a page's text read, in
 * order, so colour is never the only signal.
 */
export function SegmentBar({ groups, className }: SegmentBarProps) {
  const cls = ['aegis-segment-bar', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={cls}>
      {groups.map((group) => (
        <span key={group.key} className="aegis-segment-bar__group">
          {Array.from({ length: group.count }, (_, index) => (
            <span
              key={index}
              className={`aegis-segment-bar__segment aegis-segment-bar__segment--${group.tone}`}
              aria-hidden="true"
            />
          ))}
          <span className="aegis-segment-bar__label">{group.label}</span>
        </span>
      ))}
    </span>
  );
}
