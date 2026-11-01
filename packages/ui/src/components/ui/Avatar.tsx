import { type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import './Avatar.css';

type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';
/** Index into `--data-cat-1` … `--data-cat-6`, the chart series colours. */
export type AvatarColorSlot = 1 | 2 | 3 | 4 | 5 | 6;

export type AvatarSurface = PrimitiveSurface<{
  name: string;
  status?: AvatarStatus;
}>;

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  icon?: ReactNode;
  /**
   * Colours the initials fallback with `--data-cat-<n>` instead of the
   * name-hashed hue, so it matches that series in charts.
   */
  colorSlot?: AvatarColorSlot;
  className?: string;
  surface?: AvatarSurface;
}

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();
}

const HUE_COUNT = 5;

function hueFromName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return (hash % HUE_COUNT) + 1;
}

export function Avatar({
  name,
  src,
  size = 'md',
  status,
  icon,
  colorSlot,
  className,
  surface,
}: AvatarProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const agentAttrs = usePrimitiveSurface(
    surface,
    { name, status },
    'entity',
    wrapRef,
  );

  const cls = ['aegis-avatar', `aegis-avatar--${size}`, className]
    .filter(Boolean)
    .join(' ');

  const wrapperCls = ['aegis-avatar-wrap', `aegis-avatar-wrap--${size}`].join(
    ' ',
  );

  const content = src ? (
    <img src={src} alt={name} className={cls} />
  ) : (
    <span
      className={`${cls} ${
        colorSlot === undefined
          ? `aegis-avatar--hue-${hueFromName(name)}`
          : `aegis-avatar--slot-${colorSlot}`
      }`}
      aria-label={name}
      role="img"
    >
      {icon ?? initialsFromName(name)}
    </span>
  );

  if (!status) {
    if (!surface) {
      return content;
    }
    return (
      <span ref={wrapRef} className={wrapperCls} {...agentAttrs}>
        {content}
      </span>
    );
  }

  return (
    <span ref={wrapRef} className={wrapperCls} {...agentAttrs}>
      {content}
      <span
        className={`aegis-avatar__status aegis-avatar__status--${status}`}
        aria-label={status}
      />
    </span>
  );
}
