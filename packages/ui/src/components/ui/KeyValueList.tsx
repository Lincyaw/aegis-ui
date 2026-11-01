import { type ReactNode, useRef } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import './KeyValueList.css';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';

export interface KeyValueItem {
  /** Left key (mono — IDs, fields). */
  k: ReactNode;
  /** Right value (mono number / string). */
  v: ReactNode;
}

export type KeyValueListSurface = PrimitiveSurface<KeyValueItem[]>;

interface KeyValueListProps {
  items: KeyValueItem[];
  /** Render keys as uppercase tracked labels instead of mono. */
  uppercaseKeys?: boolean;
  /** Top hairline above the first row. */
  ruled?: boolean;
  className?: string;
  surface?: KeyValueListSurface;
}

export function KeyValueList({
  items,
  uppercaseKeys = false,
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
          <dt className="aegis-kv__k">
            {uppercaseKeys ? (
              <MetricLabel>{item.k}</MetricLabel>
            ) : (
              <MonoValue size="sm" weight="regular">
                {item.k}
              </MonoValue>
            )}
          </dt>
          <dd className="aegis-kv__v">
            <MonoValue size="sm">{item.v}</MonoValue>
          </dd>
        </div>
      ))}
    </dl>
  );
}
