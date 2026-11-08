import {
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const TABBABLE =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface DialogPopover<P extends HTMLElement> {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Closes the popover and hands focus back to the trigger. */
  close: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
  panelRef: RefObject<P>;
  onPanelKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Open state and keyboard handling for a click-triggered panel in an antd
 * `Popover` that is not a menu, such as a small form or a list of links.
 * The popover portals to `document.body`, so focus is moved to the panel's
 * first control on open. Escape, and Tab past the last control or
 * Shift+Tab past the first or from the panel itself, close it and hand
 * focus back to the trigger, from where Tab carries on through the page.
 */
export function useDialogPopover<P extends HTMLElement>(): DialogPopover<P> {
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
      (panel?.querySelector<HTMLElement>(TABBABLE) ?? panel)?.focus({
        preventScroll: true,
      });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const onPanelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
        // Stops here, so a dialog or drawer around the trigger stays open.
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const panel = event.currentTarget;
      const tabbable = Array.from(
        panel.querySelectorAll<HTMLElement>(TABBABLE),
      ).filter((element) => element.getClientRects().length > 0);
      // The panel itself holds focus when it has no control or after a click
      // on its background; Shift+Tab from there leaves it too.
      const atEdge = event.shiftKey
        ? event.target === panel || event.target === tabbable[0]
        : tabbable.length === 0 ||
          event.target === tabbable[tabbable.length - 1];
      if (!atEdge) {
        return;
      }
      // Shift+Tab lands on the trigger; Tab carries on from it, so the
      // browser's own move is kept.
      if (event.shiftKey) {
        event.preventDefault();
      }
      close();
    },
    [close],
  );

  return { open, setOpen, close, triggerRef, panelRef, onPanelKeyDown };
}
