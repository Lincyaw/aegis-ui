import { type CSSProperties, type ReactNode } from 'react';

import './ColumnLayout.css';

interface ColumnLayoutProps {
  /**
   * `grid-template-columns` above 768 px, e.g. `'872fr 304fr'` or
   * `'240fr 552fr 360fr'`. Each child is one column; below 768 px they
   * stack. Nest a `columns="1fr"` layout to stack cards inside a column
   * with the same gap.
   */
  columns: string;
  /** `md` = `--space-4`, `lg` = `--space-6`. */
  gap?: 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

export function ColumnLayout({
  columns,
  gap = 'lg',
  children,
  className,
}: ColumnLayoutProps) {
  const cls = [
    'aegis-column-layout',
    `aegis-column-layout--gap-${gap}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      className={cls}
      style={{ '--aegis-column-layout-columns': columns } as CSSProperties}
    >
      {children}
    </div>
  );
}
