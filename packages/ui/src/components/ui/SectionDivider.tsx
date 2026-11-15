import type { ReactNode } from 'react';

import './SectionDivider.css';

interface SectionDividerProps {
  /** Uppercase tracked label. */
  children: ReactNode;
  /** Right-aligned content (chip / link / mono value). */
  extra?: ReactNode;
  /** Render the hairline rule below the label. */
  rule?: boolean;
  /**
   * `meta` is the uppercase tracked micro label. `group` names a group of
   * fields or rows inside a pane in the label type role, in sentence case,
   * e.g. 原文 or 验证记录 with its count as the extra.
   */
  variant?: 'meta' | 'group';
  className?: string;
}

export function SectionDivider({
  children,
  extra,
  rule = true,
  variant = 'meta',
  className,
}: SectionDividerProps) {
  const cls = [
    'aegis-section-divider',
    rule ? 'aegis-section-divider--ruled' : '',
    variant === 'group' ? 'aegis-section-divider--group' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      <div className="aegis-section-divider__head">
        <span className="aegis-section-divider__label">{children}</span>
        {extra && <span className="aegis-section-divider__extra">{extra}</span>}
      </div>
    </div>
  );
}
