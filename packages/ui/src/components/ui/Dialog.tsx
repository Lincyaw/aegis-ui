import { type ReactNode, useEffect, useRef } from 'react';

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

  if (!open) {
    return null;
  }

  const cls = ['aegis-dialog', `aegis-dialog--${width}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="aegis-dialog__backdrop">
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
            关闭
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
