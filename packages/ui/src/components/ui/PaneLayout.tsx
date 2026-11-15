import type { ReactNode } from 'react';

import './PaneLayout.css';

export interface PaneLayoutProps {
  /** `row` sets the panes side by side, `column` stacks them. */
  direction?: 'row' | 'column';
  /**
   * `Pane`s, or nested `PaneLayout`s set directly in place of a pane: a
   * nested layout fills its share as a pane does, and is not wrapped in one.
   */
  children: ReactNode;
  className?: string;
}

/**
 * A region filled edge to edge by panes, each divided from the next by a
 * hairline, with no gap and no card around them. It grows to fill a flex
 * parent such as a bleed `PageWrapper`; at 768 px or narrower a row stacks
 * and the whole layout scrolls as one.
 */
export function PaneLayout({
  direction = 'row',
  children,
  className,
}: PaneLayoutProps) {
  const cls = [
    'aegis-pane-layout',
    `aegis-pane-layout--${direction}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return <div className={cls}>{children}</div>;
}

export interface PaneProps {
  /**
   * `fill` shares the room left by the others; `sm`, `md` and `lg` are the
   * fixed `--pane-width-*` widths of a row; `auto` takes its content's size.
   */
  size?: 'fill' | 'sm' | 'md' | 'lg' | 'auto';
  /** `md` insets the content by `--space-6` (`--space-4` at ≤768 px). */
  padding?: 'none' | 'md';
  /** Names the pane for assistive technology, making it a region. */
  label?: string;
  children: ReactNode;
  className?: string;
}

/** One pane of a `PaneLayout`; it scrolls its own content. */
export function Pane({
  size = 'fill',
  padding = 'md',
  label,
  children,
  className,
}: PaneProps) {
  const cls = [
    'aegis-pane',
    `aegis-pane--${size}`,
    `aegis-pane--padding-${padding}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return label === undefined ? (
    <div className={cls}>{children}</div>
  ) : (
    <section className={cls} aria-label={label}>
      {children}
    </section>
  );
}
