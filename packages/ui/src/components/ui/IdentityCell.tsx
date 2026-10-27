import type { ComponentType, ReactNode } from 'react';

import { Avatar, type AvatarColorSlot } from './Avatar';
import './IdentityCell.css';

/**
 * Router link adapter. The contract matches `BreadcrumbLinkComponent`, so one
 * adapter around the router's `<Link>` serves both primitives.
 */
export type IdentityCellLinkComponent = ComponentType<{
  to: string;
  className?: string;
  children: ReactNode;
}>;

interface IdentityCellProps {
  /** Primary line, e.g. a model or task name. Truncates; the full name shows on hover. */
  name: string;
  /** Muted mono line under the name, e.g. the agent or a source path. */
  secondary?: ReactNode;
  /** Leads with an Avatar of the name's initials. */
  avatar?: boolean;
  /** Avatar colour from the chart series colours, so it matches that series. */
  colorSlot?: AvatarColorSlot;
  /** Makes the name a link to this destination. */
  to?: string;
  /** Renders the link. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: IdentityCellLinkComponent;
  /** Puts the secondary text beside the name on one line. */
  inline?: boolean;
  className?: string;
}

const DefaultLink: IdentityCellLinkComponent = ({
  to,
  className,
  children,
}) => (
  <a href={to} className={className}>
    {children}
  </a>
);

export function IdentityCell({
  name,
  secondary,
  avatar = false,
  colorSlot,
  to,
  linkComponent,
  inline = false,
  className,
}: IdentityCellProps) {
  const LinkImpl = linkComponent ?? DefaultLink;
  const cls = [
    'aegis-identity-cell',
    inline ? 'aegis-identity-cell--inline' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls}>
      {avatar ? (
        <span className="aegis-identity-cell__avatar" aria-hidden="true">
          <Avatar name={name} size="sm" colorSlot={colorSlot} />
        </span>
      ) : null}
      <span className="aegis-identity-cell__text" title={name}>
        {to === undefined ? (
          <span className="aegis-identity-cell__name">{name}</span>
        ) : (
          <LinkImpl
            to={to}
            className="aegis-identity-cell__name aegis-identity-cell__name--link"
          >
            {name}
          </LinkImpl>
        )}
        {secondary ? (
          <span className="aegis-identity-cell__secondary">{secondary}</span>
        ) : null}
      </span>
    </span>
  );
}
