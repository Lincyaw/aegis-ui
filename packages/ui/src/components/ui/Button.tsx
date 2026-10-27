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
import { DefaultLink, type LinkComponent } from './linkComponent';

type ButtonTone = 'primary' | 'secondary' | 'ghost';

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children'
>;

interface ButtonProps extends NativeButtonProps {
  children: ReactNode;
  /** Visual treatment. */
  tone?: ButtonTone;
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

interface ButtonLinkProps {
  /** Destination; the control navigates instead of firing a handler. */
  to: string;
  children: ReactNode;
  tone?: ButtonTone;
  /** Renders the link. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
  className?: string;
}

/** A link that looks like a Button, for actions that open another page. */
export function ButtonLink({
  to,
  children,
  tone = 'primary',
  linkComponent,
  className,
}: ButtonLinkProps) {
  const LinkImpl = linkComponent ?? DefaultLink;
  const cls = ['aegis-button', `aegis-button--${tone}`, className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <LinkImpl to={to} className={cls}>
      {children}
    </LinkImpl>
  );
}
