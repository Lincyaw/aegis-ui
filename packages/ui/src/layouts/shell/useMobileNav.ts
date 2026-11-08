import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useMediaQuery } from '../../hooks/useMediaQuery';

const MOBILE_QUERY = '(max-width: 768px)';

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

interface MobileNav {
  open: boolean;
  toggle: () => void;
  /** Closes the drawer and returns focus to the menu toggle. */
  dismiss: () => void;
  shellRef: RefObject<HTMLDivElement>;
  drawerRef: RefObject<HTMLElement>;
  toggleRef: RefObject<HTMLButtonElement>;
  backdropRef: RefObject<HTMLButtonElement>;
}

/** Makes every element in `root` inert except `kept` and their ancestors; returns the undo. */
function inertOutside(root: Element, kept: Element[]): () => void {
  const madeInert: HTMLElement[] = [];
  const visit = (parent: Element): void => {
    for (const child of parent.children) {
      if (kept.includes(child)) {
        continue;
      }
      if (kept.some((element) => child.contains(element))) {
        visit(child);
      } else if (child instanceof HTMLElement && !child.inert) {
        child.inert = true;
        madeInert.push(child);
      }
    }
  };
  visit(root);
  return () => {
    for (const element of madeInert) {
      element.inert = false;
    }
  };
}

/**
 * The sidebar drawer at 768 px and below. While open it is modal: focus
 * moves to its first item, the rest of the shell but the menu toggle and
 * the backdrop is inert, and Escape or the backdrop closes it and returns
 * focus to the toggle. Navigating or widening the window closes it and
 * leaves focus where it is.
 */
export function useMobileNav(pathname: string): MobileNav {
  const [open, setOpen] = useState(false);
  const mobile = useMediaQuery(MOBILE_QUERY);
  const shellRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobile) {
      setOpen(false);
    }
  }, [mobile]);

  const toggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    const drawer = drawerRef.current;
    if (!open || !mobile || !shell || !drawer) {
      return undefined;
    }
    const kept = [drawer, toggleRef.current, backdropRef.current].filter(
      (element): element is HTMLElement => element !== null,
    );
    const restore = inertOutside(shell, kept);
    drawer.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      const { target } = event;
      // A dialog or popup portalled out of the shell answers its own Escape.
      const fromShell =
        target === document.body ||
        (target instanceof Node && shell.contains(target));
      if (event.key === 'Escape' && !event.isComposing && fromShell) {
        dismiss();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      restore();
    };
  }, [open, mobile, dismiss]);

  return {
    open,
    toggle,
    dismiss,
    shellRef,
    drawerRef,
    toggleRef,
    backdropRef,
  };
}
