import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const TABBABLE =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface PopoverDialog<P extends HTMLElement> {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Closes the popover and hands focus back to the trigger. */
  close: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
  panelRef: RefObject<P>;
}

/**
 * Open state and focus handling for a click-triggered panel in an antd
 * `Popover` that is not a menu, such as a small form or a list of links.
 * The popover portals to `document.body`, so focus is moved to the panel's
 * first control on open. Escape, and Tab past the last control or
 * Shift+Tab past the first, close it and hand focus back to the trigger,
 * from where Tab carries on through the page.
 */
export function usePopoverDialog<P extends HTMLElement>(): PopoverDialog<P> {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<P>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    let panel: P | null = null;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !event.isComposing) {
        // Stops here, so a dialog or drawer around the trigger stays open.
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab' || !panel) {
        return;
      }
      const tabbable = Array.from(
        panel.querySelectorAll<HTMLElement>(TABBABLE),
      ).filter((element) => element.getClientRects().length > 0);
      const atEdge =
        tabbable.length === 0 ||
        event.target ===
          (event.shiftKey ? tabbable[0] : tabbable[tabbable.length - 1]);
      if (!atEdge) {
        return;
      }
      // Shift+Tab lands on the trigger; Tab carries on from it, so the
      // browser's own move is kept.
      if (event.shiftKey) {
        event.preventDefault();
      }
      close();
    };
    // The portal container is attached in the popover's own effects, so
    // wait a frame before looking for the panel.
    const frame = requestAnimationFrame(() => {
      panel = panelRef.current;
      if (!panel) {
        return;
      }
      panel.addEventListener('keydown', onKeyDown);
      (panel.querySelector<HTMLElement>(TABBABLE) ?? panel).focus({
        preventScroll: true,
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      panel?.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return { open, setOpen, close, triggerRef, panelRef };
}
