import {
  type RefCallback,
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
  /** The panel's ref; the hook listens on the panel for Escape and Tab. */
  panelRef: RefCallback<P>;
}

/**
 * Open state and keyboard handling for a click-triggered panel in an antd
 * `Popover` that is not a menu, such as a small form or a list of links.
 * The popover portals to `document.body`, so focus is moved to the panel's
 * first control on open. Escape, and Tab past the last control or
 * Shift+Tab past the first or from the panel itself, close it and hand
 * focus back to the trigger, from where Tab carries on through the page.
 * Escape stops at the panel, so a dialog or drawer around the trigger
 * stays open.
 */
export function useDialogPopover<P extends HTMLElement>(): DialogPopover<P> {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panel = useRef<P | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    // The portal container is attached in the popover's own effects, so
    // wait a frame before looking for the panel.
    const frame = requestAnimationFrame(() => {
      const node = panel.current;
      (node?.querySelector<HTMLElement>(TABBABLE) ?? node)?.focus({
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

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const node = panel.current;
      if (!node) {
        return;
      }
      if (event.key === 'Escape' && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const tabbable = Array.from(
        node.querySelectorAll<HTMLElement>(TABBABLE),
      ).filter((element) => element.getClientRects().length > 0);
      // The panel itself holds focus when it has no control or after a click
      // on its background; Shift+Tab from there leaves it too.
      const atEdge = event.shiftKey
        ? event.target === node || event.target === tabbable[0]
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

  // Listening from the moment the panel mounts, before focus moves into it.
  const panelRef = useCallback(
    (node: P | null) => {
      panel.current?.removeEventListener('keydown', onKeyDown);
      panel.current = node;
      node?.addEventListener('keydown', onKeyDown);
    },
    [onKeyDown],
  );

  return { open, setOpen, close, triggerRef, panelRef };
}
