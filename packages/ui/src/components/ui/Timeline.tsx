import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  type PrimitiveSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import './Timeline.css';
import { DefaultLink, type LinkComponent } from './linkComponent';

export interface TimelineItem {
  id: string;
  /** Headline — actor / event / verb, e.g. "alice@aegis updated `db.dsn`". */
  title: ReactNode;
  /** Body — optional secondary line. */
  description?: ReactNode;
  /** Absolute timestamp, in the numeric face. */
  timestamp?: ReactNode;
  /** Slot at the end of the title row, in the numeric face (e.g. a revision). */
  meta?: ReactNode;
  /** CSS colour for the dot, e.g. `var(--accent-success)`. */
  dotColor?: string;
  /**
   * Leading label in the `numbered` variant, e.g. a step number.
   * Defaults to the 1-based position, zero-padded to two digits.
   */
  marker?: ReactNode;
  /** In the `list` mode, makes the item a link to this destination. */
  href?: string;
}

export type TimelineSurface = PrimitiveSurface<TimelineItem[]>;

interface TimelineProps {
  items: TimelineItem[];
  /**
   * `numbered` replaces the dot and connector with a leading marker
   * column, separates rows with hairlines and keeps the line breaks of
   * each description.
   */
  variant?: 'dot' | 'numbered';
  /**
   * `compact` keeps each title on one line with an ellipsis (a string title
   * shows in full on hover) and tightens the rows.
   */
  density?: 'comfortable' | 'compact';
  /**
   * `listbox` (default): with `onSelect` the list is a listbox. `list`: the
   * list stays a list of items, the selected one marked `aria-current` and
   * each item with an `href` a link, e.g. one per run that opens its page.
   */
  mode?: 'listbox' | 'list';
  /**
   * The selected item, drawn inverted when `onSelect` is set or in the
   * `list` mode. With `onSelect` in the `listbox` mode each item is an
   * option, clicked or chosen with Enter or Space, and ↑ ↓ Home End move
   * between them from one tab stop.
   */
  selectedId?: string;
  /** Fired when an item is chosen in the `listbox` mode; a `list` follows its links instead. */
  onSelect?: (item: TimelineItem) => void;
  /** Renders the `list` mode's links. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
  /**
   * Bounds the list to `--timeline-scroll-max-height` and scrolls it. The
   * list scrolls itself, never the page, to keep the selected item in view
   * when it mounts and when `selectedId` changes.
   */
  scrollable?: boolean;
  /** The list's accessible name; name a selectable list. */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  surface?: TimelineSurface;
}

export function Timeline({
  items,
  variant = 'dot',
  density = 'comfortable',
  mode = 'listbox',
  selectedId,
  onSelect,
  linkComponent,
  scrollable = false,
  ariaLabel,
  className,
  style,
  surface,
}: TimelineProps) {
  const wrapRef = useRef<HTMLOListElement>(null);
  const agentAttrs = usePrimitiveSurface(surface, items, 'timeline', wrapRef);
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined);
  const numbered = variant === 'numbered';
  const compact = density === 'compact';
  const list = mode === 'list';
  const selectable = !list && onSelect !== undefined;
  const LinkImpl = linkComponent ?? DefaultLink;
  const rootClass = [
    'aegis-timeline',
    numbered ? 'aegis-timeline--numbered' : '',
    compact ? 'aegis-timeline--compact' : '',
    selectable ? 'aegis-timeline--selectable' : '',
    list ? 'aegis-timeline--list' : '',
    scrollable ? 'aegis-timeline--scrollable' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const selectedIndex = items.findIndex((it) => it.id === selectedId);
  const focusedIndex = items.findIndex((it) => it.id === focusedId);
  const tabStopIndex =
    focusedIndex >= 0 ? focusedIndex : Math.max(selectedIndex, 0);

  useLayoutEffect(() => {
    const list = wrapRef.current;
    const item = list?.querySelector<HTMLElement>(
      ':scope > .aegis-timeline__item--selected',
    );
    if (!list || !item) {
      return;
    }
    const top =
      item.getBoundingClientRect().top -
      list.getBoundingClientRect().top +
      list.scrollTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTop = top;
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [selectedId]);

  const focusItem = (index: number): void => {
    if (index < 0 || index >= items.length) {
      return;
    }
    setFocusedId(items[index].id);
    wrapRef.current
      ?.querySelectorAll<HTMLElement>(':scope > [role="option"]')
      [index]?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLLIElement>,
    index: number,
  ): void => {
    switch (event.key) {
      case 'ArrowDown':
        focusItem(index + 1);
        break;
      case 'ArrowUp':
        focusItem(index - 1);
        break;
      case 'Home':
        focusItem(0);
        break;
      case 'End':
        focusItem(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        onSelect?.(items[index]);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <ol
      ref={wrapRef}
      className={rootClass}
      style={style}
      role={selectable ? 'listbox' : list ? 'list' : undefined}
      aria-label={ariaLabel}
      {...agentAttrs}
    >
      {items.map((it, index) => {
        const current = it.id === selectedId;
        const href = list ? it.href : undefined;
        const className = [
          'aegis-timeline__item',
          numbered ? 'aegis-timeline__item--numbered' : '',
          (selectable || list) && current
            ? 'aegis-timeline__item--selected'
            : '',
          href !== undefined ? 'aegis-timeline__item--link' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const content = (
          <>
            {numbered ? (
              <span className="aegis-timeline__marker">
                {it.marker ?? String(index + 1).padStart(2, '0')}
              </span>
            ) : (
              <span
                className="aegis-timeline__dot"
                style={it.dotColor ? { background: it.dotColor } : undefined}
              />
            )}
            <div className="aegis-timeline__body">
              <div className="aegis-timeline__row">
                <span
                  className="aegis-timeline__title"
                  title={
                    compact && typeof it.title === 'string'
                      ? it.title
                      : undefined
                  }
                >
                  {href !== undefined ? (
                    <LinkImpl
                      to={href}
                      className="aegis-timeline__link"
                      aria-current={current ? 'true' : undefined}
                    >
                      {it.title}
                    </LinkImpl>
                  ) : (
                    it.title
                  )}
                </span>
                {it.meta ? (
                  <span className="aegis-timeline__meta">{it.meta}</span>
                ) : null}
              </div>
              {it.description ? (
                <div className="aegis-timeline__desc">{it.description}</div>
              ) : null}
              {it.timestamp ? (
                <div className="aegis-timeline__time">{it.timestamp}</div>
              ) : null}
            </div>
          </>
        );
        if (list) {
          return (
            <li
              key={it.id}
              className={className}
              aria-current={current && href === undefined ? 'true' : undefined}
            >
              {content}
            </li>
          );
        }
        if (!selectable) {
          return (
            <li key={it.id} className={className}>
              {content}
            </li>
          );
        }
        return (
          <li
            key={it.id}
            className={className}
            role="option"
            aria-selected={it.id === selectedId}
            tabIndex={index === tabStopIndex ? 0 : -1}
            onClick={() => {
              onSelect(it);
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, index);
            }}
            onFocus={() => {
              setFocusedId(it.id);
            }}
          >
            {content}
          </li>
        );
      })}
    </ol>
  );
}
