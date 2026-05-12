import { type ReactNode, useRef } from 'react';

import { useAegisSurface } from '../../agent/hooks';
import type { SurfaceKind, SurfaceSnapshot } from '../../agent/types';
import './DataList.css';

export interface DataListColumn<T> {
  key: string;
  label: ReactNode;
  render?: (row: T) => ReactNode;
}

export interface DataListItem {
  id: string;
}

export interface DataListSurface<T> {
  id: string;
  kind?: SurfaceKind;
  label?: string;
  project: (rows: T[]) => Pick<SurfaceSnapshot, 'entities' | 'fields'>;
  askSuggestions?: string[];
  /** When false, AskOverlay skips this surface (per docs §7.1). */
  ask?: boolean;
}

interface DataListProps<T extends DataListItem> {
  items: T[];
  columns: Array<DataListColumn<T>>;
  selectedId?: string;
  onSelect?: (id: string) => void;
  surface?: DataListSurface<T>;
  emptyText?: string;
  className?: string;
}

export function DataList<T extends DataListItem>({
  items,
  columns,
  selectedId,
  onSelect,
  surface,
  emptyText = 'No items',
  className,
}: DataListProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // Hook called unconditionally; `enabled: false` skips registration.
  useAegisSurface<T[]>({
    id: surface?.id ?? '__unused__',
    kind: surface?.kind ?? 'list',
    label: surface?.label,
    askSuggestions: surface?.askSuggestions,
    data: items,
    project: surface ? surface.project : () => ({}),
    ref: wrapRef,
    enabled: Boolean(surface),
  });

  const cls = ['aegis-data-list', className ?? ''].filter(Boolean).join(' ');

  return (
    <div
      ref={wrapRef}
      className={cls}
      data-agent-surface-id={surface?.id}
      data-agent-ask={surface?.ask === false ? 'off' : undefined}
    >
      <div className="aegis-data-list__head">
        {columns.map((col) => (
          <div key={col.key} className="aegis-data-list__head-cell">
            {col.label}
          </div>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="aegis-data-list__empty">{emptyText}</div>
      ) : (
        items.map((row) => {
          const isSelected = selectedId === row.id;
          const rowCls = [
            'aegis-data-list__row',
            isSelected ? 'aegis-data-list__row--selected' : '',
            onSelect ? 'aegis-data-list__row--interactive' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              type="button"
              key={row.id}
              className={rowCls}
              data-agent-entity-id={row.id}
              aria-pressed={isSelected || undefined}
              onClick={onSelect ? () => onSelect(row.id) : undefined}
            >
              {columns.map((col) => (
                <div key={col.key} className="aegis-data-list__cell">
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '')}
                </div>
              ))}
            </button>
          );
        })
      )}
    </div>
  );
}

export default DataList;
