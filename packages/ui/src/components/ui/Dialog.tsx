import {
  type AnimationEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import { useStrings } from '../../locale';
import './Dialog.css';

interface DialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  /** Action row rendered at the bottom of the panel, right-aligned. */
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  className?: string;
}

const TABBABLE =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [contenteditable="true"], [tabindex]';

/** Open dialog panels, innermost last; only the innermost answers Escape and Tab. */
const openPanels: HTMLElement[] = [];

/** Keeps Tab and Shift+Tab cycling through the panel's tabbable elements. */
function wrapTabFocus(panel: HTMLElement, event: KeyboardEvent): void {
  const tabbable = Array.from(
    panel.querySelectorAll<HTMLElement>(TABBABLE),
  ).filter(
    (element) => element.tabIndex >= 0 && element.getClientRects().length > 0,
  );
  const first = tabbable[0];
  const last = tabbable[tabbable.length - 1];
  const active = document.activeElement;
  const inside =
    active !== panel && active instanceof Node && panel.contains(active);
  const atEdge = event.shiftKey ? active === first : active === last;
  if (!inside || atEdge) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

/**
 * Portalled to `document.body` so a transformed or glass (backdrop-filter)
 * ancestor cannot become the containing block of the fixed backdrop. Not a
 * native `<dialog>`: its top layer would sit above antd's body-level
 * popups and toasts. While open, focus stays inside the panel and the page
 * behind it does not scroll.
 */
export function Dialog({
  open,
  title,
  description,
  onClose,
  footer,
  width = 'md',
  children,
  className,
}: DialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const strings = useStrings();
  // Stays mounted after `open` turns false until the exit animation ends.
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) {
    setRendered(true);
  }
  const closing = rendered && !open;

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) {
      return undefined;
    }
    const returnFocusTo = document.activeElement;
    openPanels.push(panel);
    panel.focus();
    return () => {
      openPanels.splice(openPanels.indexOf(panel), 1);
      if (returnFocusTo instanceof HTMLElement) {
        returnFocusTo.focus();
      }
    };
  }, [open]);

  // The page behind the backdrop stays put; a kept scrollbar gutter stops
  // the page from shifting sideways when its scrollbar goes.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const root = document.documentElement;
    const previous = {
      overflow: root.style.overflow,
      scrollbarGutter: root.style.scrollbarGutter,
    };
    if (window.innerWidth > root.clientWidth) {
      root.style.scrollbarGutter = 'stable';
    }
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous.overflow;
      root.style.scrollbarGutter = previous.scrollbarGutter;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      const panel = panelRef.current;
      if (!panel || openPanels[openPanels.length - 1] !== panel) {
        return;
      }
      // Escape inside an IME composition only cancels the composition.
      if (event.key === 'Escape' && !event.isComposing) {
        onClose();
      } else if (event.key === 'Tab') {
        wrapTabFocus(panel, event);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useLayoutEffect(() => {
    // Without an exit animation (reduced motion) no animationend arrives.
    if (closing && backdropRef.current?.getAnimations().length === 0) {
      setRendered(false);
    }
  }, [closing]);

  if (!rendered) {
    return null;
  }

  const onBackdropAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (closing && event.target === event.currentTarget) {
      setRendered(false);
    }
  };
  const cls = ['aegis-dialog', `aegis-dialog--${width}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div
      ref={backdropRef}
      className={
        closing
          ? 'aegis-dialog__backdrop aegis-dialog__backdrop--closing'
          : 'aegis-dialog__backdrop'
      }
      onAnimationEnd={onBackdropAnimationEnd}
    >
      <div
        ref={panelRef}
        className={cls}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        tabIndex={-1}
      >
        <div className="aegis-dialog__header">
          <div className="aegis-dialog__heading">
            <h2 id={titleId} className="aegis-dialog__title">
              {title}
            </h2>
            {description !== undefined && (
              <div id={descriptionId} className="aegis-dialog__description">
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            className="aegis-dialog__close"
            onClick={onClose}
          >
            {strings.close}
          </button>
        </div>
        {children !== undefined && (
          <div className="aegis-dialog__body">{children}</div>
        )}
        {footer !== undefined && (
          <div className="aegis-dialog__footer">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
