import { type CSSProperties, type ReactNode, useRef } from 'react';

import {
  type ContainerSurface,
  usePrimitiveSurface,
} from '../../agent/core/usePrimitiveSurface';
import './Panel.css';
import { DefaultLink, type LinkComponent } from './linkComponent';

export type PanelSurface = ContainerSurface;

/**
 * `tint` for showcase blocks on overview and article pages, `brand` for
 * featured content, `glass` for a panel laid over a gradient or image.
 */
export type PanelVariant = 'solid' | 'tint' | 'brand' | 'glass';

/** `raised` lifts featured and hero cards above the resting cards. */
export type PanelElevation = 'rest' | 'raised';

interface PanelBaseProps {
  /** Muted line under the title, e.g. a chart's metric and direction. */
  description?: ReactNode;
  extra?: ReactNode;
  variant?: PanelVariant;
  elevation?: PanelElevation;
  /** False drops the body padding, e.g. for a table that fills the panel. */
  padded?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  surface?: PanelSurface;
}

interface PanelStaticProps extends PanelBaseProps {
  title?: ReactNode;
  to?: undefined;
  linkComponent?: undefined;
}

interface PanelLinkProps extends PanelBaseProps {
  /** The link's text; the link covers the whole panel. */
  title: ReactNode;
  /**
   * Destination; the panel lifts on hover. Controls belong in `extra`,
   * which stays clickable above the link; the body is part of the link.
   */
  to: string;
  /** Renders the link. Defaults to an `<a href>`; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
}

type PanelProps = PanelStaticProps | PanelLinkProps;

export function Panel({
  title,
  description,
  extra,
  variant = 'solid',
  elevation = 'rest',
  padded = true,
  to,
  linkComponent,
  className,
  style,
  children,
  surface,
}: PanelProps) {
  const wrapRef = useRef<HTMLElement>(null);
  const agentAttrs = usePrimitiveSurface(surface, null, 'panel', wrapRef);
  const LinkImpl = linkComponent ?? DefaultLink;
  const rootClass = [
    'aegis-panel',
    `aegis-panel--${variant}`,
    `aegis-panel--${elevation}`,
    to === undefined ? '' : 'aegis-panel--link',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const showHeader = Boolean(title ?? extra ?? description);
  const titleText =
    typeof title === 'string' ? (
      <span className="aegis-panel__title">{title}</span>
    ) : (
      title
    );
  const titleNode =
    to === undefined ? (
      titleText
    ) : (
      <LinkImpl to={to} className="aegis-panel__link">
        {titleText}
      </LinkImpl>
    );

  return (
    <section ref={wrapRef} className={rootClass} style={style} {...agentAttrs}>
      {showHeader && (
        <header className="aegis-panel__header">
          {description === undefined ? (
            titleNode
          ) : (
            <div className="aegis-panel__heading">
              {titleNode}
              <span className="aegis-panel__description">{description}</span>
            </div>
          )}
          {extra && <div className="aegis-panel__extra">{extra}</div>}
        </header>
      )}
      <div
        className={`aegis-panel__body${padded ? ' aegis-panel__body--padded' : ''}`}
      >
        {children}
      </div>
    </section>
  );
}
