import { type ReactNode, useState } from 'react';

import { RightOutlined } from '@ant-design/icons';

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
  // A panel mounts its children the first time it opens and keeps them, so
  // closing can animate instead of dropping the content at once.
  const [visited, setVisited] = useState<string[]>(open);
  const unvisited = open.filter((key) => !visited.includes(key));
  if (unvisited.length > 0) {
    setVisited([...visited, ...unvisited]);
  }
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
              <RightOutlined className="aegis-collapse__chevron" aria-hidden />
            </button>
            <div
              id={`aegis-collapse-${item.key}`}
              className={
                expanded
                  ? 'aegis-collapse__panel aegis-collapse__panel--open'
                  : 'aegis-collapse__panel'
              }
              role="region"
            >
              <div className="aegis-collapse__clip">
                <div className="aegis-collapse__body">
                  {(expanded || visited.includes(item.key)) && item.children}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
