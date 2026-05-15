import type { ReactNode } from 'react';

import { SearchOutlined } from '@ant-design/icons';

import { Chip } from './Chip';
import './Toolbar.css';

export interface FilterChip {
  key: string;
  label: string;
}

export interface ToolbarProps {
  /** Generic left slot — when provided, replaces the baked-in search row. */
  left?: ReactNode;
  /** Optional center slot. */
  center?: ReactNode;
  /** Generic right slot — when provided, replaces the `action` prop. */
  right?: ReactNode;

  /* ── Legacy search-bar props (backwards-compatible) ── */
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterChip[];
  onFilterRemove?: (key: string) => void;
  onClearFilters?: () => void;
  /** @deprecated Use `right` instead. */
  action?: ReactNode;

  className?: string;
}

export function Toolbar({
  left,
  center,
  right,
  searchPlaceholder = 'Search…',
  searchValue = '',
  onSearchChange,
  filters = [],
  onFilterRemove,
  onClearFilters,
  action,
  className,
}: ToolbarProps) {
  const hasFilters = filters.length > 0;
  const cls = ['aegis-toolbar', className ?? ''].filter(Boolean).join(' ');

  const leftContent =
    left !== undefined ? (
      left
    ) : (
      <>
        <div className="aegis-toolbar__search">
          <SearchOutlined className="aegis-toolbar__search-icon" />
          <input
            type="text"
            className="aegis-toolbar__search-input"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label="Search"
          />
        </div>
        {hasFilters && (
          <div className="aegis-toolbar__filters">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className="aegis-toolbar__filter-btn"
                onClick={() => onFilterRemove?.(f.key)}
                title={`Remove filter ${f.label}`}
              >
                <Chip tone="default">{f.label}</Chip>
                <span className="aegis-toolbar__filter-close">×</span>
              </button>
            ))}
            {onClearFilters && (
              <button
                type="button"
                className="aegis-toolbar__clear"
                onClick={onClearFilters}
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </>
    );

  const rightContent = right !== undefined ? right : action;

  return (
    <div className={cls}>
      <div className="aegis-toolbar__left">{leftContent}</div>
      {center !== undefined ? (
        <div className="aegis-toolbar__center">{center}</div>
      ) : null}
      {rightContent !== undefined ? (
        <div className="aegis-toolbar__right">{rightContent}</div>
      ) : null}
    </div>
  );
}

export default Toolbar;
