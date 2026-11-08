import type { ReactNode } from 'react';

import { CloseOutlined, SearchOutlined } from '@ant-design/icons';

import { useStrings } from '../../locale';
import './SearchInput.css';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional keyboard shortcut hint, e.g. `⌘K`. */
  kbd?: ReactNode;
  onClear?: () => void;
  /**
   * Fills the container's width, the field taking the free space. A host
   * that sizes the search (e.g. a flex-basis in a toolbar) sets this too.
   */
  block?: boolean;
  /** Lets a caller's `<label htmlFor>` name the field; without an id the placeholder names it. */
  id?: string;
  /** Ids of the text that describes the field, such as a FormRow's description. */
  'aria-describedby'?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  kbd,
  onClear,
  block = false,
  id,
  'aria-describedby': describedBy,
  className,
}: SearchInputProps) {
  const strings = useStrings();
  const cls = [
    'aegis-search-input',
    block ? 'aegis-search-input--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} data-aegis-field>
      <SearchOutlined className="aegis-search-input__icon" aria-hidden />
      <input
        type="text"
        id={id}
        className="aegis-search-input__field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={id === undefined ? placeholder : undefined}
        aria-describedby={describedBy}
      />
      {value.length > 0 && onClear !== undefined ? (
        <button
          type="button"
          className="aegis-search-input__clear"
          onClick={onClear}
          aria-label={strings.clearSearch}
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
