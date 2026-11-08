import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from 'react';

import { flushSync } from 'react-dom';

import { Tooltip } from 'antd';

import { useAegisAction } from '../../agent/core/hooks';
import type { AegisAction } from '../../agent/core/types';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import './Tabs.css';
import { DefaultLink, type LinkComponent } from './linkComponent';
import { tablistKeyTarget } from './tablistKeyboard';

export interface TabItem {
  key: string;
  label: ReactNode;
  /**
   * Cannot be selected. The tab still takes focus from the arrow keys, so
   * its hint can be read.
   */
  disabled?: boolean;
  /**
   * The tab's tooltip, e.g. why it is disabled. It opens on hover and focus
   * and is the tab's accessible description.
   */
  hint?: string;
  /** Optional aegis-ui agent action — fired after the tab activates. */
  action?: AegisAction<void, unknown>;
}

/**
 * A tab that is a link to a page. Tabs given links render a `nav` of links
 * that look like tabs, each one a tab stop. The link a controlled
 * `activeKey` names is `aria-current="page"`; without `activeKey` none is.
 */
export interface TabLink {
  key: string;
  label: ReactNode;
  to: string;
}

interface TabsProps {
  /** The tabs, or the links of tabs that are pages; a list is one or the other. */
  items: TabItem[] | TabLink[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  children?: ReactNode;
  /**
   * Renders the tab list without a tabpanel, for tabs that switch a view
   * rendered elsewhere, e.g. a toolbar view switch.
   */
  listOnly?: boolean;
  /**
   * The tab list's accessible name, or with links the `nav`'s, when no
   * visible heading names it.
   */
  ariaLabel?: string;
  /** Renders the `TabLink`s. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
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

function isTabLinks(items: TabItem[] | TabLink[]): items is TabLink[] {
  return items.some((item) => 'to' in item);
}

function findSelectedTab(list: HTMLElement): HTMLElement | null {
  return list.querySelector<HTMLElement>(':scope > .aegis-tabs__tab--active');
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

function tabClass(active: boolean): string {
  return active ? 'aegis-tabs__tab aegis-tabs__tab--active' : 'aegis-tabs__tab';
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
  linkComponent: Link = DefaultLink,
  panelId,
  size = 'md',
  className,
}: TabsProps) {
  const baseId = useId();
  const tabId = (index: number): string => `${baseId}-tab-${String(index)}`;
  const ownPanelId = `${baseId}-panel`;
  const controlledPanelId = listOnly ? panelId : ownPanelId;
  const entries: ReadonlyArray<TabItem | TabLink> = items;
  const linked = isTabLinks(items);
  const [internalKey, setInternalKey] = useState(
    defaultActiveKey ?? entries[0]?.key,
  );
  const activeKey = controlledKey ?? internalKey;
  const listRef = useRef<HTMLDivElement>(null);
  const placedKeyRef = useRef<string | undefined>(undefined);
  const [indicator, setIndicator] = useState<TabsIndicator | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const itemKeys = entries.map((item) => item.key).join('\n');

  // A link is current only when a controlled activeKey names it. Arrows,
  // Home and End move between all the tabs and select the enabled ones. The
  // list has one tab stop: the focused tab while focus is in the list, so
  // Tab and Shift+Tab leave it from a disabled tab too; otherwise the
  // selected tab, or the first enabled one when none is selected.
  const activeIndex = linked
    ? items.findIndex((item) => item.key === controlledKey)
    : items.findIndex(
        (item) => item.key === activeKey && item.disabled !== true,
      );
  const focusedIndex = entries.findIndex((item) => item.key === focusedKey);
  const tabStopIndex =
    focusedIndex >= 0
      ? focusedIndex
      : activeIndex >= 0
        ? activeIndex
        : linked
          ? 0
          : Math.max(
              items.findIndex((item) => item.disabled !== true),
              0,
            );

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
    // activeIndex changes without activeKey when the selected tab is disabled
    // or enabled again; the indicator leaves or returns.
  }, [activeKey, activeIndex]);

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
    for (const tab of list.querySelectorAll(':scope > .aegis-tabs__tab')) {
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

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    const target = tablistKeyTarget(event.key, index, entries.length);
    if (target === null) {
      return;
    }
    event.preventDefault();
    const tab = listRef.current?.querySelectorAll<HTMLButtonElement>(
      ':scope > [role="tab"]',
    )[target];
    tab?.focus();
    // The click runs the tab's own activation, including its agent action;
    // a disabled tab ignores it.
    tab?.click();
  };

  const cls = [
    'aegis-tabs',
    size === 'sm' ? 'aegis-tabs--sm' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const list = (
    <div
      ref={listRef}
      className="aegis-tabs__list"
      role={linked ? undefined : 'tablist'}
      aria-label={linked ? undefined : ariaLabel}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusedKey(null);
        }
      }}
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
      {linked
        ? items.map((item, index) => (
            <Link
              key={item.key}
              to={item.to}
              className={tabClass(index === activeIndex)}
              aria-current={index === activeIndex ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))
        : items.map((item, index) => (
            <TabsTab
              key={item.key}
              id={tabId(index)}
              item={item}
              active={index === activeIndex}
              controls={index === activeIndex ? controlledPanelId : undefined}
              tabStop={index === tabStopIndex}
              onActivate={() => handleClick(item.key)}
              onFocus={() => setFocusedKey(item.key)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            />
          ))}
    </div>
  );

  return linked ? (
    <nav className={cls} aria-label={ariaLabel}>
      {list}
    </nav>
  ) : (
    <div className={cls}>
      {list}
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
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

function TabsTab({
  id,
  item,
  active,
  controls,
  tabStop,
  onActivate,
  onFocus,
  onKeyDown,
}: TabsTabProps) {
  const bound = useAegisAction<void, unknown>(item.action);
  const handleClick = (): void => {
    if (item.disabled === true) {
      return;
    }
    onActivate();
    if (item.action) {
      void bound.invoke();
    }
  };
  const tab = (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      aria-disabled={item.disabled === true ? true : undefined}
      tabIndex={tabStop ? 0 : -1}
      className={tabClass(active)}
      onClick={handleClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      data-agent-action-id={item.action?.id}
    >
      {item.label}
    </button>
  );
  if (item.hint === undefined) {
    return tab;
  }
  // The tooltip names the tab in aria-describedby; rendering it up front
  // means the description is there the first time the tab takes focus.
  return (
    <Tooltip title={item.hint} trigger={['hover', 'focus']} forceRender>
      {tab}
    </Tooltip>
  );
}
