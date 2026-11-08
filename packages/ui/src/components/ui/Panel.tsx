import { type CSSProperties, type ReactNode, useId, useRef } from 'react';

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

/**
 * `raised` lifts featured and hero cards above the resting cards. `flat`
 * casts no shadow, for a panel inside another panel: one shadow per layer.
 */
export type PanelElevation = 'rest' | 'raised' | 'flat';

interface PanelBaseProps {
  /**
   * Muted line under the title, e.g. a chart's metric and direction. Shows
   * the header on its own, as `title` does.
   */
  description?: ReactNode;
  /** Controls at the header's end. Show the header on their own, as `title` does. */
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
  /**
   * The panel's heading, and the accessible name of the panel, which is then
   * a `region`. The header shows when `title`, `description` or `extra` has
   * content, i.e. anything React renders: `0` counts, while `undefined`,
   * `null`, `true`, `false` and `''` do not.
   */
  title?: ReactNode;
  to?: undefined;
  linkComponent?: undefined;
}

interface PanelLinkProps extends PanelBaseProps {
  /** The link's text, and the panel's accessible name; the link covers the whole panel. */
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

function hasContent(node: ReactNode): boolean {
  return (
    node !== undefined &&
    node !== null &&
    typeof node !== 'boolean' &&
    node !== ''
  );
}

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
  const titleId = useId();
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

  const hasDescription = hasContent(description);
  const hasExtra = hasContent(extra);
  const hasTitle = hasContent(title);
  const showHeader = hasTitle || hasDescription || hasExtra;
  const titleText = !hasTitle ? null : typeof title === 'string' ? (
    <span id={titleId} className="aegis-panel__title">
      {title}
    </span>
  ) : (
    <span id={titleId}>{title}</span>
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
    <section
      ref={wrapRef}
      className={rootClass}
      style={style}
      aria-labelledby={hasTitle ? titleId : undefined}
      {...agentAttrs}
    >
      {showHeader && (
        <header className="aegis-panel__header">
          {!hasDescription ? (
            titleNode
          ) : (
            <div className="aegis-panel__heading">
              {titleNode}
              <span className="aegis-panel__description">{description}</span>
            </div>
          )}
          {hasExtra && <div className="aegis-panel__extra">{extra}</div>}
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
