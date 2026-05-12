import {
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  forwardRef,
  useCallback,
} from 'react';

import { useAegisAction } from '../../agent/hooks';
import type { AegisAction } from '../../agent/types';
import './Button.css';

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children'
>;

interface ButtonProps extends NativeButtonProps {
  children: ReactNode;
  /** Visual treatment. */
  tone?: 'primary' | 'secondary' | 'ghost';
  /** Optional aegis-ui agent action — also wires the agent runtime. */
  action?: AegisAction<void, unknown>;
  /** Native HTML button type. */
  type?: 'button' | 'submit' | 'reset';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      tone = 'primary',
      action,
      onClick,
      disabled,
      className,
      type = 'button',
      title,
      ...rest
    },
    ref,
  ) => {
    const bound = useAegisAction<void, unknown>(action);
    const isUnavailable = action ? !bound.available : false;

    const handleClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>): void => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (action) {
          void bound.invoke();
        }
      },
      [onClick, action, bound],
    );

    const cls = ['aegis-button', `aegis-button--${tone}`, className ?? '']
      .filter(Boolean)
      .join(' ');

    const resolvedTitle =
      title ?? (isUnavailable ? bound.unavailableReason : undefined);

    return (
      <button
        ref={ref}
        type={type}
        className={cls}
        disabled={disabled ?? isUnavailable}
        title={resolvedTitle}
        data-agent-action-id={action?.id}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
