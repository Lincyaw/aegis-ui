import {
  type AnimationEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useStrings } from '../../locale';
import './Dialog.css';

interface DialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  /** Action row rendered at the bottom of the panel. */
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
  className?: string;
}

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
  const panelRef = useRef<HTMLDivElement>(null);
  const strings = useStrings();
  // Stays mounted after `open` turns false until the exit animation ends.
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) {
    setRendered(true);
  }
  const closing = rendered && !open;

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!rendered) {
    return null;
  }

  const cls = ['aegis-dialog', `aegis-dialog--${width}`, className ?? '']
    .filter(Boolean)
    .join(' ');
  const onBackdropAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (closing && event.target === event.currentTarget) {
      setRendered(false);
    }
  };

  return (
    <div
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
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
      >
        <div className="aegis-dialog__header">
          <div className="aegis-dialog__heading">
            <span className="aegis-dialog__title">{title}</span>
            {description !== undefined && (
              <span className="aegis-dialog__description">{description}</span>
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
    </div>
  );
}
