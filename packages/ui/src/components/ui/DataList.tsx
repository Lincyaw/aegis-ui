import { type KeyboardEvent, type ReactNode, useRef, useState } from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import './DataList.css';

export interface DataListColumn<T> {
  key: string;
  header: ReactNode;
  /** Defaults to the row's `key` field as text. */
  render?: (row: T) => ReactNode;
}

export interface DataListItem {
  id: string;
}

export type DataListSurface<T> = PrimitiveSurface<T[]>;

interface DataListProps<T extends DataListItem> {
  items: T[];
  columns: Array<DataListColumn<T>>;
  selectedId?: string;
  /**
   * Makes rows selectable: one tab stop (the selected row, else the first),
   * ↑ ↓ Home End between rows, a muted hover background, and Enter or
   * Space on a focused row. Without it rows are plain.
   */
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
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const [focusedId, setFocusedId] = useState<string>();

  // Hook called unconditionally; `enabled: false` skips registration.
  const agentAttrs = usePrimitiveSurface(surface, items, 'list', wrapRef);

  const cls = ['aegis-data-list', className ?? ''].filter(Boolean).join(' ');
  const cellRole = onSelect ? 'gridcell' : 'cell';

  const hasItem = (id: string | undefined): boolean =>
    items.some((item) => item.id === id);
  const tabStopId = hasItem(focusedId)
    ? focusedId
    : hasItem(selectedId)
      ? selectedId
      : items.length > 0
        ? items[0].id
        : undefined;

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    index: number,
  ): void => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(items[index].id);
      return;
    }
    let next: number | undefined;
    if (event.key === 'ArrowDown') {
      next = Math.min(index + 1, items.length - 1);
    } else if (event.key === 'ArrowUp') {
      next = Math.max(index - 1, 0);
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = items.length - 1;
    }
    if (next !== undefined) {
      event.preventDefault();
      rowRefs.current.get(items[next].id)?.focus();
    }
  };

  return (
    <div
      ref={wrapRef}
      className={cls}
      role={onSelect ? 'grid' : 'table'}
      {...agentAttrs}
    >
      <div className="aegis-data-list__head" role="row">
        {columns.map((col) => (
          <div
            key={col.key}
            className="aegis-data-list__head-cell"
            role="columnheader"
          >
            {col.header}
          </div>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="aegis-data-list__empty" role="row">
          <div role={cellRole} aria-colspan={columns.length}>
            {emptyText}
          </div>
        </div>
      ) : (
        items.map((row, index) => {
          const isSelected = selectedId === row.id;
          const rowCls = [
            'aegis-data-list__row',
            isSelected ? 'aegis-data-list__row--selected' : '',
            onSelect ? 'aegis-data-list__row--interactive' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const cells = columns.map((col) => (
            <div
              key={col.key}
              className="aegis-data-list__cell"
              role={cellRole}
            >
              {col.render
                ? col.render(row)
                : String((row as Record<string, unknown>)[col.key] ?? '')}
            </div>
          ));
          return onSelect ? (
            <div
              key={row.id}
              ref={(el) => {
                if (el) {
                  rowRefs.current.set(row.id, el);
                } else {
                  rowRefs.current.delete(row.id);
                }
              }}
              className={rowCls}
              role="row"
              tabIndex={row.id === tabStopId ? 0 : -1}
              aria-selected={isSelected}
              data-agent-entity-id={row.id}
              onClick={() => {
                onSelect(row.id);
              }}
              onFocus={() => {
                setFocusedId(row.id);
              }}
              onKeyDown={(event) => {
                handleKeyDown(event, index);
              }}
            >
              {cells}
            </div>
          ) : (
            <div
              key={row.id}
              className={rowCls}
              role="row"
              data-agent-entity-id={row.id}
            >
              {cells}
            </div>
          );
        })
      )}
    </div>
  );
}
