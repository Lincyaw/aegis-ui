import type { ReactNode } from 'react';

import { CloseOutlined, SearchOutlined } from '@ant-design/icons';

import './SearchInput.css';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional keyboard shortcut hint, e.g. `⌘K`. */
  kbd?: ReactNode;
  onClear?: () => void;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  kbd,
  onClear,
  className,
}: SearchInputProps) {
  const cls = ['aegis-search-input', className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <SearchOutlined className="aegis-search-input__icon" aria-hidden />
      <input
        type="text"
        className="aegis-search-input__field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
      {value.length > 0 && onClear !== undefined ? (
        <button
          type="button"
          className="aegis-search-input__clear"
          onClick={onClear}
          aria-label="Clear search"
        >
          <CloseOutlined />
        </button>
      ) : null}
      {kbd !== undefined && value.length === 0 ? (
        <kbd className="aegis-search-input__kbd">{kbd}</kbd>
      ) : null}
    </div>
  );
}

export default SearchInput;
