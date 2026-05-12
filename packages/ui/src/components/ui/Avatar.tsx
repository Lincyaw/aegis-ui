import { type ReactNode, useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './Avatar.css';

type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

export interface AvatarSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (data: {
    name: string;
    status?: AvatarStatus;
  }) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  icon?: ReactNode;
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
  className,
  surface,
}: AvatarProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  useAegisSurface<{ name: string; status?: AvatarStatus }>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'entity',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: { name, status },
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });

  const cls = ['aegis-avatar', `aegis-avatar--${size}`, className]
    .filter(Boolean)
    .join(' ');

  const wrapperCls = ['aegis-avatar-wrap', `aegis-avatar-wrap--${size}`].join(
    ' ',
  );

  const surfaceAttrs = {
    'data-agent-surface-id': surface?.id,
    'data-agent-ask': surface?.ask === false ? 'off' : undefined,
  } as const;

  const content = src ? (
    <img src={src} alt={name} className={cls} />
  ) : (
    <span
      className={`${cls} aegis-avatar--hue-${hueFromName(name)}`}
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
      <span ref={wrapRef} className="aegis-avatar-wrap" {...surfaceAttrs}>
        {content}
      </span>
    );
  }

  return (
    <span ref={wrapRef} className={wrapperCls} {...surfaceAttrs}>
      {content}
      <span
        className={`aegis-avatar__status aegis-avatar__status--${status}`}
        aria-label={status}
      />
    </span>
  );
}

export default Avatar;
