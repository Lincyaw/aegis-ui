import type { ReactNode } from 'react';

import { Avatar, type AvatarColorSlot } from './Avatar';
import './IdentityCell.css';
import { DefaultLink, type LinkComponent } from './linkComponent';

interface IdentityCellProps {
  /** Primary line, e.g. a model or task name. Truncates; the full name shows on hover. */
  name: string;
  /** Muted `--font-mono` line under the name for an id or path, e.g. `source / task`; a string shows in full on hover. */
  secondary?: ReactNode;
  /** Leads with an Avatar of the name's initials. */
  avatar?: boolean;
  /**
   * A mark before the name, outside the link, e.g. a StatusDot with its
   * label: it stays beside the name however the name truncates.
   */
  leading?: ReactNode;
  /** Avatar colour from the chart series colours, so it matches that series. */
  colorSlot?: AvatarColorSlot;
  /** Makes the name a link to this destination. */
  to?: string;
  /**
   * The link's accessible name when the name shown is short, e.g. "Expand
   * trace" for a link that shows "Expand".
   */
  ariaLabel?: string;
  /** Renders the link. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
  /** Puts the secondary text beside the name on one line. */
  inline?: boolean;
  /** Wraps the name and the secondary text, breaking anywhere, instead of truncating, so a long
   * name never widens the card or list it sits in. */
  wrap?: boolean;
  /** Sets the name in `--font-mono`, for an id, a key or a path. */
  mono?: boolean;
  /** `sm` sets the name in the small type role (or the mono role), for a bar or a muted line. */
  size?: 'md' | 'sm';
  /**
   * `link` inks a linked name in the link blue, for references listed in a
   * record's fields; `ink` (default) keeps the surrounding ink, for names in
   * rows and trees, where the row itself reads as the way in.
   */
  tone?: 'ink' | 'link';
  className?: string;
}

export function IdentityCell({
  name,
  secondary,
  avatar = false,
  leading,
  colorSlot,
  to,
  ariaLabel,
  linkComponent,
  inline = false,
  wrap = false,
  mono = false,
  size = 'md',
  tone = 'ink',
  className,
}: IdentityCellProps) {
  const LinkImpl = linkComponent ?? DefaultLink;
  const cls = [
    'aegis-identity-cell',
    inline ? 'aegis-identity-cell--inline' : '',
    wrap ? 'aegis-identity-cell--wrap' : '',
    mono ? 'aegis-identity-cell--mono' : '',
    size === 'sm' ? 'aegis-identity-cell--sm' : '',
    tone === 'link' ? 'aegis-identity-cell--link-tone' : '',
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
      {leading === undefined ? null : (
        <span className="aegis-identity-cell__leading">{leading}</span>
      )}
      <span className="aegis-identity-cell__text" title={name}>
        {to === undefined ? (
          <span className="aegis-identity-cell__name">{name}</span>
        ) : (
          <LinkImpl
            to={to}
            className="aegis-identity-cell__name aegis-identity-cell__name--link"
            aria-label={ariaLabel}
          >
            {name}
          </LinkImpl>
        )}
        {secondary ? (
          <span
            className="aegis-identity-cell__secondary"
            title={typeof secondary === 'string' ? secondary : undefined}
          >
            {secondary}
          </span>
        ) : null}
      </span>
    </span>
  );
}
