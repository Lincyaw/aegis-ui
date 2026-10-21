import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { useAegisAction } from '../../agent/hooks';
import type { AegisAction } from '../../agent/types';
import './Tabs.css';

export interface TabItem {
  key: string;
  label: ReactNode;
  /** Optional aegis-ui agent action — fired after the tab activates. */
  action?: AegisAction<void, unknown>;
}

interface TabsProps {
  items: TabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  children?: ReactNode;
  className?: string;
}

export function Tabs({
  items,
  activeKey: controlledKey,
  defaultActiveKey,
  onChange,
  children,
  className,
}: TabsProps) {
  const [internalKey, setInternalKey] = useState(
    defaultActiveKey ?? items[0]?.key,
  );
  const activeKey = controlledKey ?? internalKey;
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector(':scope > [aria-selected="true"]');
    if (!list || !tab) {
      return;
    }
    const inset = parseFloat(getComputedStyle(list).paddingLeft);
    const listBox = list.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    if (tabBox.left < listBox.left + inset) {
      list.scrollLeft -= listBox.left + inset - tabBox.left;
    } else if (tabBox.right > listBox.right - inset) {
      list.scrollLeft += tabBox.right - (listBox.right - inset);
    }
  }, [activeKey]);

  const handleClick = (key: string) => {
    if (controlledKey === undefined) {
      setInternalKey(key);
    }
    onChange?.(key);
  };

  const cls = ['aegis-tabs', className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div ref={listRef} className="aegis-tabs__list" role="tablist">
        {items.map((item) => (
          <TabsTab
            key={item.key}
            item={item}
            active={item.key === activeKey}
            onActivate={() => handleClick(item.key)}
          />
        ))}
      </div>
      <div className="aegis-tabs__panel" role="tabpanel">
        {children}
      </div>
    </div>
  );
}

interface TabsTabProps {
  item: TabItem;
  active: boolean;
  onActivate: () => void;
}

function TabsTab({ item, active, onActivate }: TabsTabProps) {
  const bound = useAegisAction<void, unknown>(item.action);
  const handleClick = (): void => {
    onActivate();
    if (item.action) {
      void bound.invoke();
    }
  };
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={
        active ? 'aegis-tabs__tab aegis-tabs__tab--active' : 'aegis-tabs__tab'
      }
      onClick={handleClick}
      data-agent-action-id={item.action?.id}
    >
      {item.label}
    </button>
  );
}
