import type { ReactNode } from 'react';

import './PanelTitle.css';

interface PanelTitleProps {
  children: ReactNode;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4';
  /** Type roles: sm Strong, base Heading, lg Title, hero Display. */
  size?: 'sm' | 'base' | 'lg' | 'hero';
  className?: string;
}

const sizeClass: Record<NonNullable<PanelTitleProps['size']>, string> = {
  sm: 'aegis-panel-title--sm',
  base: 'aegis-panel-title--base',
  lg: 'aegis-panel-title--lg',
  hero: 'aegis-panel-title--hero',
};

export function PanelTitle({
  children,
  as: Tag = 'span',
  size = 'base',
  className,
}: PanelTitleProps) {
  const cls = ['aegis-panel-title', sizeClass[size], className ?? '']
    .filter(Boolean)
    .join(' ');

  return <Tag className={cls}>{children}</Tag>;
}
