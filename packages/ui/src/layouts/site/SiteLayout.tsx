import { type ReactElement, type ReactNode, useId, useRef } from 'react';

import {
  AmbientBackground,
  type AmbientBackgroundVariant,
} from '../../components/ui/AmbientBackground';
import { useStrings } from '../../locale';
import './SiteLayout.css';

export interface SiteLayoutProps {
  /** The top bar, usually a `SiteNav`. */
  nav: ReactNode;
  footer?: ReactNode;
  /** Draws the ambient glows behind the page; `hero` for an overview page. */
  ambient?: AmbientBackgroundVariant;
  className?: string;
  /** The page: `SiteSection` bands, each holding its own content column. */
  children: ReactNode;
}

/**
 * The frame of the public site: a skip link, the nav, the page and the
 * footer. Unlike `AegisShell` it adds no sidebar and no padding, so a page
 * can run its bands edge to edge.
 */
export function SiteLayout({
  nav,
  footer,
  ambient,
  className,
  children,
}: SiteLayoutProps): ReactElement {
  const strings = useStrings();
  const mainId = useId();
  const mainRef = useRef<HTMLElement>(null);
  return (
    <div className={['aegis-site', className ?? ''].join(' ').trim()}>
      {/* Moves focus without a URL fragment, so a shared page link stays as it was. */}
      <a
        className="aegis-site__skip"
        href={`#${mainId}`}
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        {strings.skipToContent}
      </a>
      {ambient && <AmbientBackground variant={ambient} />}
      {nav}
      <main
        ref={mainRef}
        id={mainId}
        tabIndex={-1}
        className="aegis-site__main"
      >
        {children}
      </main>
      {footer}
    </div>
  );
}
