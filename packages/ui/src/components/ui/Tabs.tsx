import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from 'react';

import { flushSync } from 'react-dom';

import { useAegisAction } from '../../agent/core/hooks';
import type { AegisAction } from '../../agent/core/types';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import './Tabs.css';
import { tablistKeyTarget } from './tablistKeyboard';

export interface TabItem {
  key: string;
  label: ReactNode;
  /** Cannot be selected; the arrow keys pass over it. */
  disabled?: boolean;
  /** The tab's tooltip, e.g. why it is disabled. */
  hint?: string;
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
  /** The tab list's accessible name, when no visible heading names it. */
  ariaLabel?: string;
  /**
   * With `listOnly`, the id of the `role="tabpanel"` element that shows the
   * selected tab's content; the selected tab names it in `aria-controls`.
   */
  panelId?: string;
  /**
   * `sm` makes each tab `--size-control-sm` tall, so the whole list is
   * `--size-control-base` and lines up with inputs in a toolbar.
   */
  size?: 'md' | 'sm';
  className?: string;
}

interface TabBox {
  left: number;
  right: number;
  top: number;
  height: number;
}

/** Which way the indicator travels; the edge facing that way leads. */
type TabsIndicatorTravel = 'none' | 'forward' | 'backward';

interface TabsIndicator extends TabBox {
  travel: TabsIndicatorTravel;
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
    left: tab.offsetLeft,
    right: list.clientWidth - tab.offsetLeft - tab.offsetWidth,
    top: tab.offsetTop,
    height: tab.offsetHeight,
  };
}

function isSameTabBox(a: TabBox | null, b: TabBox | null): boolean {
  if (!a || !b) {
    return a === b;
  }
  return (
    a.left === b.left &&
    a.right === b.right &&
    a.top === b.top &&
    a.height === b.height
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
  ariaLabel,
  panelId,
  size = 'md',
  className,
}: TabsProps) {
  const baseId = useId();
  const tabId = (index: number): string => `${baseId}-tab-${String(index)}`;
  const ownPanelId = `${baseId}-panel`;
  const controlledPanelId = listOnly ? panelId : ownPanelId;
  const [internalKey, setInternalKey] = useState(
    defaultActiveKey ?? items[0]?.key,
  );
  const activeKey = controlledKey ?? internalKey;
  const listRef = useRef<HTMLDivElement>(null);
  const placedKeyRef = useRef<string | undefined>(undefined);
  const [indicator, setIndicator] = useState<TabsIndicator | null>(null);
  const itemKeys = items.map((item) => item.key).join('\n');

  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const moved =
      placedKeyRef.current !== undefined && placedKeyRef.current !== activeKey;
    placedKeyRef.current = activeKey;
    const box = measureSelectedTab(list);
    setIndicator((current) => {
      if (!box) {
        return null;
      }
      if (!moved || !current) {
        return { ...box, travel: 'none' };
      }
      return {
        ...box,
        travel: box.left < current.left ? 'backward' : 'forward',
      };
    });
    scrollSelectedTabIntoView(list);
  }, [activeKey]);

  // Tab widths change after web fonts load, when a label's count changes and
  // when a hidden list is first shown; follow them without sliding. The
  // indicator's right edge is measured from the list's width, so the update
  // commits before paint, never showing it stretched for a frame.
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const observer = new ResizeObserver(() => {
      const box = measureSelectedTab(list);
      flushSync(() => {
        setIndicator((current) =>
          isSameTabBox(current, box)
            ? current
            : box && { ...box, travel: 'none' },
        );
      });
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

  // Tab reaches only the selected tab, or the first enabled one when none is
  // selected; arrows, Home and End move between the enabled tabs.
  const activeIndex = items.findIndex(
    (item) => item.key === activeKey && item.disabled !== true,
  );
  const tabStopIndex =
    activeIndex >= 0
      ? activeIndex
      : Math.max(
          items.findIndex((item) => item.disabled !== true),
          0,
        );

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    const target = tablistKeyTarget(
      event.key,
      index,
      items.length,
      (i) => items[i].disabled === true,
    );
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
      <div
        ref={listRef}
        className="aegis-tabs__list"
        role="tablist"
        aria-label={ariaLabel}
      >
        {indicator ? (
          <span
            aria-hidden="true"
            className={
              indicator.travel === 'none'
                ? 'aegis-tabs__indicator'
                : `aegis-tabs__indicator aegis-tabs__indicator--${indicator.travel}`
            }
            style={{
              left: indicator.left,
              right: indicator.right,
              top: indicator.top,
              height: indicator.height,
            }}
          />
        ) : null}
        {items.map((item, index) => (
          <TabsTab
            key={item.key}
            id={tabId(index)}
            item={item}
            active={index === activeIndex}
            controls={index === activeIndex ? controlledPanelId : undefined}
            tabStop={index === tabStopIndex}
            onActivate={() => handleClick(item.key)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          />
        ))}
      </div>
      {listOnly ? null : (
        <div
          id={ownPanelId}
          className="aegis-tabs__panel"
          role="tabpanel"
          aria-labelledby={activeIndex >= 0 ? tabId(activeIndex) : undefined}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface TabsTabProps {
  id: string;
  item: TabItem;
  active: boolean;
  controls: string | undefined;
  tabStop: boolean;
  onActivate: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

function TabsTab({
  id,
  item,
  active,
  controls,
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
      id={id}
      aria-selected={active}
      aria-controls={controls}
      disabled={item.disabled}
      title={item.hint}
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
