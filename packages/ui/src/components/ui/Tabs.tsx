import {
  type KeyboardEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useAegisAction } from '../../agent/core/hooks';
import type { AegisAction } from '../../agent/core/types';
import './Tabs.css';
import { tablistKeyTarget } from './tablistKeyboard';

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
  /**
   * Renders the tab list without a tabpanel, for tabs that switch a view
   * rendered elsewhere (site navigation, a toolbar view switch).
   */
  listOnly?: boolean;
  /**
   * `sm` makes each tab `--size-control-sm` tall, so the whole list is
   * `--size-control-base` and lines up with inputs in a toolbar.
   */
  size?: 'md' | 'sm';
  className?: string;
}

interface TabBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TabsIndicator extends TabBox {
  slide: boolean;
}

function findSelectedTab(list: HTMLElement): HTMLElement | null {
  return list.querySelector<HTMLElement>(':scope > [aria-selected="true"]');
}

function measureSelectedTab(list: HTMLElement): TabBox | null {
  const tab = findSelectedTab(list);
  if (!tab) {
    return null;
  }
  return {
    x: tab.offsetLeft,
    y: tab.offsetTop,
    width: tab.offsetWidth,
    height: tab.offsetHeight,
  };
}

function isSameTabBox(a: TabBox | null, b: TabBox | null): boolean {
  if (!a || !b) {
    return a === b;
  }
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
}

function scrollSelectedTabIntoView(list: HTMLElement): void {
  const tab = findSelectedTab(list);
  if (!tab) {
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
}

export function Tabs({
  items,
  activeKey: controlledKey,
  defaultActiveKey,
  onChange,
  children,
  listOnly = false,
  size = 'md',
  className,
}: TabsProps) {
  const [internalKey, setInternalKey] = useState(
    defaultActiveKey ?? items[0]?.key,
  );
  const activeKey = controlledKey ?? internalKey;
  const listRef = useRef<HTMLDivElement>(null);
  const placedKeyRef = useRef<string | undefined>(undefined);
  const [indicator, setIndicator] = useState<TabsIndicator | null>(null);
  const itemKeys = items.map((item) => item.key).join('\n');

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const slide =
      placedKeyRef.current !== undefined && placedKeyRef.current !== activeKey;
    placedKeyRef.current = activeKey;
    const box = measureSelectedTab(list);
    setIndicator(box && { ...box, slide });
    scrollSelectedTabIntoView(list);
  }, [activeKey]);

  // Tab widths change after web fonts load, when a label's count changes and
  // when a hidden list is first shown; follow them without sliding.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const observer = new ResizeObserver(() => {
      const box = measureSelectedTab(list);
      setIndicator((current) =>
        isSameTabBox(current, box) ? current : box && { ...box, slide: false },
      );
    });
    observer.observe(list);
    for (const tab of list.querySelectorAll(':scope > [role="tab"]')) {
      observer.observe(tab);
    }
    return () => {
      observer.disconnect();
    };
  }, [itemKeys]);

  const handleClick = (key: string) => {
    if (controlledKey === undefined) {
      setInternalKey(key);
    }
    onChange?.(key);
  };

  // Tab reaches only the selected tab, or the first when none is selected;
  // arrows, Home and End move between tabs.
  const tabStopIndex = Math.max(
    items.findIndex((item) => item.key === activeKey),
    0,
  );

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    const target = tablistKeyTarget(event.key, index, items.length);
    if (target === null) {
      return;
    }
    event.preventDefault();
    const tab = listRef.current?.querySelectorAll<HTMLButtonElement>(
      ':scope > [role="tab"]',
    )[target];
    tab?.focus();
    // The click runs the tab's own activation, including its agent action.
    tab?.click();
  };

  const cls = [
    'aegis-tabs',
    size === 'sm' ? 'aegis-tabs--sm' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      <div ref={listRef} className="aegis-tabs__list" role="tablist">
        {indicator ? (
          <span
            aria-hidden="true"
            className={
              indicator.slide
                ? 'aegis-tabs__indicator aegis-tabs__indicator--slide'
                : 'aegis-tabs__indicator'
            }
            style={{
              width: indicator.width,
              height: indicator.height,
              transform: `translate(${String(indicator.x)}px, ${String(indicator.y)}px)`,
            }}
          />
        ) : null}
        {items.map((item, index) => (
          <TabsTab
            key={item.key}
            item={item}
            active={item.key === activeKey}
            tabStop={index === tabStopIndex}
            onActivate={() => handleClick(item.key)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          />
        ))}
      </div>
      {listOnly ? null : (
        <div className="aegis-tabs__panel" role="tabpanel">
          {children}
        </div>
      )}
    </div>
  );
}

interface TabsTabProps {
  item: TabItem;
  active: boolean;
  tabStop: boolean;
  onActivate: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

function TabsTab({
  item,
  active,
  tabStop,
  onActivate,
  onKeyDown,
}: TabsTabProps) {
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
      tabIndex={tabStop ? 0 : -1}
      className={
        active ? 'aegis-tabs__tab aegis-tabs__tab--active' : 'aegis-tabs__tab'
      }
      onClick={handleClick}
      onKeyDown={onKeyDown}
      data-agent-action-id={item.action?.id}
    >
      {item.label}
    </button>
  );
}
