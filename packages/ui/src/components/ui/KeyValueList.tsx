import { type ReactNode, useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './KeyValueList.css';
import { MetricLabel } from './MetricLabel';
import { MonoValue } from './MonoValue';

export interface KeyValueItem {
  /** Left key (mono — IDs, fields). */
  k: ReactNode;
  /** Right value (mono number / string). */
  v: ReactNode;
}

export interface KeyValueListSurface {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (
    items: KeyValueItem[],
  ) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  ask?: boolean;
}

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

  useAegisSurface<KeyValueItem[]>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'detail',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: items,
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });

  const cls = ['aegis-kv', ruled ? 'aegis-kv--ruled' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <dl
      ref={wrapRef}
      className={cls}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
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

export default KeyValueList;
