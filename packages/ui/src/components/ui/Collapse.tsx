import { type ReactNode, useState } from 'react';

import './Collapse.css';

export interface CollapseItem {
  key: string;
  label: ReactNode;
  children: ReactNode;
}

interface CollapseProps {
  items: CollapseItem[];
  /** Controlled open keys. Omit for uncontrolled behaviour. */
  activeKeys?: string[];
  defaultActiveKeys?: string[];
  onChange?: (keys: string[]) => void;
  className?: string;
}

export function Collapse({
  items,
  activeKeys,
  defaultActiveKeys = [],
  onChange,
  className,
}: CollapseProps) {
  const [internal, setInternal] = useState<string[]>(defaultActiveKeys);
  const open = activeKeys ?? internal;
  const cls = ['aegis-collapse', className ?? ''].filter(Boolean).join(' ');
  const toggle = (key: string): void => {
    const next = open.includes(key)
      ? open.filter((item) => item !== key)
      : [...open, key];
    if (activeKeys === undefined) {
      setInternal(next);
    }
    onChange?.(next);
  };
  return (
    <div className={cls}>
      {items.map((item) => {
        const expanded = open.includes(item.key);
        return (
          <div className="aegis-collapse__item" key={item.key}>
            <button
              type="button"
              className="aegis-collapse__header"
              aria-expanded={expanded}
              aria-controls={`aegis-collapse-${item.key}`}
              onClick={() => {
                toggle(item.key);
              }}
            >
              <span className="aegis-collapse__label">{item.label}</span>
              <span className="aegis-collapse__marker" aria-hidden="true">
                {expanded ? '−' : '+'}
              </span>
            </button>
            {expanded && (
              <div
                id={`aegis-collapse-${item.key}`}
                className="aegis-collapse__body"
                role="region"
              >
                {item.children}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
