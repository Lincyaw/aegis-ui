import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import './AnchoredPopover.css';

/**
 * What a popover stands beside: an element, or anything that reports a
 * rectangle in viewport coordinates, such as a range of selected lines.
 */
export interface PopoverAnchor {
  getBoundingClientRect: () => DOMRect;
  /** Presses inside the anchor leave the popover open, e.g. to move a selection. */
  contains?: (node: Node) => boolean;
}

export interface AnchoredPopoverProps {
  open: boolean;
  anchor: PopoverAnchor | null;
  /** Fired by Escape, a press outside the popover and its anchor, or Tab out of it. */
  onClose: () => void;
  children: ReactNode;
  /**
   * `auto` opens below the anchor and flips above it when there is more
   * room there; `bottom` and `top` keep their side.
   */
  placement?: 'auto' | 'bottom' | 'top';
  /** `start` lines the popover up with the anchor's left edge, `end` with its right. */
  align?: 'start' | 'end';
  /** Accessible name of the popover, which is a non-modal dialog. */
  ariaLabel: string;
  className?: string;
}

const TABBABLE =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

interface Position {
  top: number;
  left: number;
  side: 'top' | 'bottom';
}

function place(
  anchor: DOMRect,
  panel: DOMRect,
  placement: NonNullable<AnchoredPopoverProps['placement']>,
  align: NonNullable<AnchoredPopoverProps['align']>,
  gap: number,
): Position {
  const below = window.innerHeight - anchor.bottom;
  const above = anchor.top;
  const side =
    placement === 'auto'
      ? below >= panel.height + gap || below >= above
        ? 'bottom'
        : 'top'
      : placement;
  const top =
    side === 'bottom' ? anchor.bottom + gap : anchor.top - gap - panel.height;
  const preferred =
    align === 'start' ? anchor.left : anchor.right - panel.width;
  const maxLeft = window.innerWidth - panel.width - gap;
  return { top, left: Math.max(gap, Math.min(preferred, maxLeft)), side };
}

/**
 * Arbitrary content in an overlay beside an anchor, e.g. what is known
 * about a selected code range. It follows the anchor as the page scrolls
 * and closes on Escape, a press outside it, or Tab past its last control.
 * Opening moves focus to its first control; Escape and Tab hand focus back
 * to where it was.
 */
export function AnchoredPopover({
  open,
  anchor,
  onClose,
  children,
  placement = 'auto',
  align = 'start',
  ariaLabel,
  className,
}: AnchoredPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const shown = open && anchor !== null;

  const update = useCallback(() => {
    const panel = panelRef.current;
    if (!panel || !anchor) {
      return;
    }
    const gap = parseFloat(
      getComputedStyle(panel).getPropertyValue('--anchored-popover-gap'),
    );
    setPosition(
      place(
        anchor.getBoundingClientRect(),
        panel.getBoundingClientRect(),
        placement,
        align,
        Number.isNaN(gap) ? 0 : gap,
      ),
    );
  }, [anchor, placement, align]);

  useLayoutEffect(() => {
    if (!shown) {
      setPosition(null);
      return undefined;
    }
    update();
    let frame = 0;
    const schedule = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [shown, update]);

  // Read by listeners that live as long as the popover is open.
  const latest = useRef({ anchor, onClose });
  latest.current = { anchor, onClose };

  const closeAndReturn = useCallback(() => {
    latest.current.onClose();
    returnFocus.current?.focus();
  }, []);

  useEffect(() => {
    if (!shown) {
      return undefined;
    }
    const active = document.activeElement;
    returnFocus.current = active instanceof HTMLElement ? active : null;
    const panel = panelRef.current;
    const onPointerDown = (event: PointerEvent): void => {
      const { target } = event;
      if (!(target instanceof Node) || panel?.contains(target)) {
        return;
      }
      if (latest.current.anchor?.contains?.(target)) {
        return;
      }
      latest.current.onClose();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!panel) {
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const tabbable = Array.from(
        panel.querySelectorAll<HTMLElement>(TABBABLE),
      ).filter((element) => element.getClientRects().length > 0);
      const atEdge = event.shiftKey
        ? event.target === panel || event.target === tabbable[0]
        : tabbable.length === 0 ||
          event.target === tabbable[tabbable.length - 1];
      if (atEdge) {
        event.preventDefault();
        closeAndReturn();
      }
    };
    // Escape from the popover or its anchor, e.g. a line number just pressed.
    const onEscape = (event: KeyboardEvent): void => {
      const { target } = event;
      if (event.key !== 'Escape' || event.isComposing) {
        return;
      }
      if (!(target instanceof Node)) {
        return;
      }
      if (panel?.contains(target)) {
        event.preventDefault();
        event.stopPropagation();
        closeAndReturn();
      } else if (latest.current.anchor?.contains?.(target)) {
        event.preventDefault();
        event.stopPropagation();
        latest.current.onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onEscape);
    panel?.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onEscape);
      panel?.removeEventListener('keydown', onKeyDown);
    };
  }, [shown, closeAndReturn]);

  // Focus moves in once the panel is placed: while hidden it cannot take it.
  const placed = position !== null;
  const focused = useRef(false);
  useEffect(() => {
    if (!shown) {
      focused.current = false;
      return;
    }
    if (!placed || focused.current) {
      return;
    }
    focused.current = true;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>(TABBABLE) ?? panel)?.focus({
      preventScroll: true,
    });
  }, [shown, placed]);

  if (!shown) {
    return null;
  }
  const cls = [
    'aegis-anchored-popover',
    position ? `aegis-anchored-popover--${position.side}` : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const style: CSSProperties = position
    ? { top: position.top, left: position.left }
    : { visibility: 'hidden' };
  return createPortal(
    <div
      ref={panelRef}
      className={cls}
      style={style}
      role="dialog"
      aria-label={ariaLabel}
      tabIndex={-1}
    >
      {children}
    </div>,
    document.body,
  );
}
