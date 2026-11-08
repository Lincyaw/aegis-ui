import { type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import './KeyValueList.css';

export interface KeyValueItem {
  /** Left key, a muted label. */
  k: ReactNode;
  /**
   * Right value, in UI type with tabular figures. Wrap ids, paths and code
   * in `MonoValue`.
   */
  v: ReactNode;
}

export type KeyValueListSurface = PrimitiveSurface<KeyValueItem[]>;

interface KeyValueListProps {
  items: KeyValueItem[];
  /** Top hairline above the first row. */
  ruled?: boolean;
  className?: string;
  surface?: KeyValueListSurface;
}

export function KeyValueList({
  items,
  ruled = true,
  className,
  surface,
}: KeyValueListProps) {
  const wrapRef = useRef<HTMLDListElement>(null);

  const agentAttrs = usePrimitiveSurface(surface, items, 'detail', wrapRef);

  const cls = ['aegis-kv', ruled ? 'aegis-kv--ruled' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <dl ref={wrapRef} className={cls} {...agentAttrs}>
      {items.map((item, i) => (
        <div className="aegis-kv__row" key={i}>
          <dt className="aegis-kv__k">{item.k}</dt>
          <dd className="aegis-kv__v">{item.v}</dd>
        </div>
      ))}
    </dl>
  );
}
