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

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'glass';

type ButtonIconPosition = 'start' | 'end';

interface ButtonLookProps {
  children: ReactNode;
  /**
   * Visual treatment. `glass` is the secondary button frosted for a tinted,
   * gradient or image background.
   */
  tone?: ButtonTone;
  /** Icon beside the label, sized to the button's icon slot. */
  icon?: ReactNode;
  /** Side of the label the icon sits on. */
  iconPosition?: ButtonIconPosition;
}

function buttonClassName(
  tone: ButtonTone,
  className: string | undefined,
): string {
  return ['aegis-button', `aegis-button--${tone}`, className ?? '']
    .filter(Boolean)
    .join(' ');
}

function ButtonContent({
  children,
  icon,
  iconPosition,
}: Pick<ButtonLookProps, 'children' | 'icon'> & {
  iconPosition: ButtonIconPosition;
}) {
  const iconSlot =
    icon === undefined ? null : (
      <span className="aegis-button__icon" aria-hidden="true">
        {icon}
      </span>
    );
  return (
    <>
      {iconPosition === 'start' && iconSlot}
      {children}
      {iconPosition === 'end' && iconSlot}
    </>
  );
}

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children'
>;

interface ButtonProps extends NativeButtonProps, ButtonLookProps {
  /** Optional aegis-ui agent action — also wires the agent runtime. */
  action?: AegisAction<void, unknown>;
  /** Native HTML button type. */
  type?: 'button' | 'submit' | 'reset';
}

/** A toggle button passes `aria-pressed`; the pressed state is the inverted fill. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      tone = 'primary',
      icon,
      iconPosition = 'start',
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

    const resolvedTitle =
      title ?? (isUnavailable ? bound.unavailableReason : undefined);

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClassName(tone, className)}
        disabled={disabled ?? isUnavailable}
        title={resolvedTitle}
        data-agent-action-id={action?.id}
        onClick={handleClick}
        {...rest}
      >
        <ButtonContent icon={icon} iconPosition={iconPosition}>
          {children}
        </ButtonContent>
      </button>
    );
  },
);
Button.displayName = 'Button';

interface ButtonLinkProps extends ButtonLookProps {
  /** Destination; the control navigates instead of firing a handler. */
  to: string;
  /** Renders the link. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
  className?: string;
}

/** A link that looks like a Button, for actions that open another page. */
export function ButtonLink({
  to,
  children,
  tone = 'primary',
  icon,
  iconPosition = 'start',
  linkComponent,
  className,
}: ButtonLinkProps) {
  const LinkImpl = linkComponent ?? DefaultLink;
  return (
    <LinkImpl to={to} className={buttonClassName(tone, className)}>
      <ButtonContent icon={icon} iconPosition={iconPosition}>
        {children}
      </ButtonContent>
    </LinkImpl>
  );
}
