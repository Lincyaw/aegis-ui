import { type ReactNode } from 'react';

import './Avatar.css';

type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  icon?: ReactNode;
  className?: string;
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
}: AvatarProps) {
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
      className={`${cls} aegis-avatar--hue-${hueFromName(name)}`}
      aria-label={name}
      role="img"
    >
      {icon ?? initialsFromName(name)}
    </span>
  );

  if (!status) {
    return content;
  }

  return (
    <span className={wrapperCls}>
      {content}
      <span
        className={`aegis-avatar__status aegis-avatar__status--${status}`}
        aria-label={status}
      />
    </span>
  );
}

export default Avatar;
