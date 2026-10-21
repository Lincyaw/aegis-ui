import {
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { PopoverProps } from 'antd';

/**
 * Flip on either axis, then slide along the trigger to stay on screen. antd's
 * `AdjustOverflow` type omits `shiftX`, but antd hands the object through to
 * rc-trigger, which supports it — without it a wide menu opened from the
 * middle of a phone screen runs off the edge.
 */
export const MENU_OVERFLOW = {
  adjustX: 1,
  adjustY: 1,
  shiftX: true,
} as PopoverProps['autoAdjustOverflow'];

const ITEM_SELECTOR = 'button:not(:disabled)';
const FIRST_FOCUS_SELECTOR = `input:not(:disabled), ${ITEM_SELECTOR}`;

export interface MenuPopover<P extends HTMLElement> {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Closes the menu and hands focus back to the trigger. */
  close: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
  panelRef: RefObject<P>;
  onTriggerKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onPanelKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Open state and keyboard handling for a click-triggered menu rendered in
 * an antd `Popover`. The popover portals to `document.body`, so focus is
 * moved into the panel on open (the selected option, else the first
 * input or button) and handed back to the trigger on Escape, Tab and
 * item activation.
 */
export function useMenuPopover<P extends HTMLElement>(): MenuPopover<P> {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<P>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    // The portal container is attached in the popover's own effects, so
    // wait a frame before looking for the panel.
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const target =
        panel?.querySelector<HTMLElement>('[aria-selected="true"]') ??
        panel?.querySelector<HTMLElement>(FIRST_FOCUS_SELECTOR);
      target?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const onTriggerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setOpen(true);
      }
    },
    [],
  );

  const onPanelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === 'Tab') {
        // No preventDefault: the browser continues the Tab from the trigger.
        close();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(ITEM_SELECTOR),
      );
      if (items.length === 0) {
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const current = items.findIndex((item) => item === event.target);
      const next =
        current === -1
          ? step === 1
            ? 0
            : items.length - 1
          : (current + step + items.length) % items.length;
      items[next].focus();
    },
    [close],
  );

  return {
    open,
    setOpen,
    close,
    triggerRef,
    panelRef,
    onTriggerKeyDown,
    onPanelKeyDown,
  };
}
