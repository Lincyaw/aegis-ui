import { type ReactNode, useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import {
  CheckGrid,
  type LinkComponent,
  MetricLabel,
  Panel,
  PanelTitle,
  useTheme,
} from '@lincyaw/aegis-ui';

import {
  GALLERY_CHECK_ROWS,
  GALLERY_CHECK_RUNS,
  type SpecimenProps,
} from './fixtures';

/* ── Static specimen data ──────────────────────────────────────────── */

/**
 * The adapter a routed app passes as `linkComponent`: links navigate through
 * the router. The router resolves a bare `#hash` against the path alone, so a
 * hash link keeps the current search, and with it the gallery's language.
 */
export const GalleryRouterLink: LinkComponent = ({
  to,
  className,
  'aria-current': ariaCurrent,
  tabIndex,
  children,
}) => {
  const { pathname, search } = useLocation();
  return (
    <RouterLink
      to={to.startsWith('#') ? { pathname, search, hash: to } : to}
      className={className}
      aria-current={ariaCurrent}
      tabIndex={tabIndex}
    >
      {children}
    </RouterLink>
  );
};

interface GallerySectionProps {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}

/** A group of specimens, in a flat Panel, so a specimen's own shadow is the only one on its layer. */
export function GallerySection({
  title,
  extra,
  children,
}: GallerySectionProps) {
  return (
    <Panel
      elevation='flat'
      title={
        <PanelTitle size='lg' as='h2'>
          {title}
        </PanelTitle>
      }
      extra={extra}
    >
      <div className='gallery__section-body'>{children}</div>
    </Panel>
  );
}

export function TokenValue({ name }: { name: string }): ReactNode {
  const { resolved } = useTheme();
  const [value, setValue] = useState('');
  useEffect(() => {
    // ThemeProvider writes data-theme in its own effect, which runs after
    // this child's effect; read on the next frame to see the new value.
    const id = requestAnimationFrame(() => {
      setValue(
        getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      );
    });
    return () => cancelAnimationFrame(id);
  }, [name, resolved]);
  return <MetricLabel size='xs'>{value}</MetricLabel>;
}

export function Specimen({
  caption,
  children,
  span = 1,
  align = 'center',
}: SpecimenProps) {
  return (
    <div className={`gallery__specimen gallery__specimen--span-${span}`}>
      <div
        className={`gallery__specimen-stage gallery__specimen-stage--${align}`}
      >
        {children}
      </div>
      <MetricLabel as='div' size='xs' className='gallery__specimen-caption'>
        {caption}
      </MetricLabel>
    </div>
  );
}

/** The host component the MdxDocument sample names; its grid keeps the CheckGrid styles inside the document. */
export function GalleryRunChecks(): ReactNode {
  return (
    <CheckGrid
      rowHeader='Check'
      passedLabel='Passed'
      uncheckedLabel='Not checked'
      columns={GALLERY_CHECK_RUNS}
      rows={GALLERY_CHECK_ROWS}
    />
  );
}
