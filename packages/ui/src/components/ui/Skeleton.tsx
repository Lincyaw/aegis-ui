import type { CSSProperties, ReactElement } from 'react';

import './Skeleton.css';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: 'sm' | 'md' | 'pill' | 'circle';
  block?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({
  width,
  height,
  radius = 'sm',
  block = false,
  className,
  style,
}: SkeletonProps): ReactElement {
  const cls = [
    'aegis-skeleton',
    `aegis-skeleton--r-${radius}`,
    block ? 'aegis-skeleton--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const dim: CSSProperties = {
    width: width ?? (block ? '100%' : undefined),
    height,
    ...style,
  };
  return (
    <div className={cls} style={dim} aria-busy="true" aria-hidden="true" />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({
  lines = 3,
  className,
}: SkeletonTextProps): ReactElement {
  const cls = ['aegis-skeleton-text', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          block
          height="var(--fs-13)"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}
