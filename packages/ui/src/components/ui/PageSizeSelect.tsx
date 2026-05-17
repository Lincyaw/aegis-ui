import { type ReactElement, useEffect, useRef, useState } from 'react';

import './PageSizeSelect.css';

export interface PageSizeSelectProps {
  value: number;
  onChange: (next: number) => void;
  options?: number[];
  disabled?: boolean;
  label?: string;
  className?: string;
}

const DEFAULT_OPTIONS: readonly number[] = [10, 20, 50, 100];

export function PageSizeSelect({
  value,
  onChange,
  options = DEFAULT_OPTIONS as number[],
  disabled = false,
  label = 'Rows per page',
  className,
}: PageSizeSelectProps): ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const idx = options.indexOf(value);
    const target = itemRefs.current[idx >= 0 ? idx : 0];
    target?.focus();
  }, [open, options, value]);

  const cls = ['aegis-page-size-select', className ?? '']
    .filter(Boolean)
    .join(' ');

  const handleTriggerKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
  ): void => {
    if (disabled) {
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleItemKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = itemRefs.current[(index + 1) % options.length];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev =
        itemRefs.current[(index - 1 + options.length) % options.length];
      prev?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const pickOption = (next: number): void => {
    setOpen(false);
    triggerRef.current?.focus();
    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <div className={cls} ref={ref}>
      {label && (
        <span
          className="aegis-page-size-select__label"
          id="aegis-page-size-label"
        >
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="aegis-page-size-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? 'aegis-page-size-label' : undefined}
        aria-label={!label ? 'Page size' : undefined}
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="aegis-page-size-select__value">{value}</span>
        <span className="aegis-page-size-select__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul className="aegis-page-size-select__panel" role="listbox">
          {options.map((opt, idx) => {
            const selected = opt === value;
            return (
              <li key={opt} role="presentation">
                <button
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={[
                    'aegis-page-size-select__item',
                    selected ? 'aegis-page-size-select__item--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    pickOption(opt);
                  }}
                  onKeyDown={(e) => {
                    handleItemKeyDown(e, idx);
                  }}
                >
                  <span className="aegis-page-size-select__item-value">
                    {opt}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PageSizeSelect;
