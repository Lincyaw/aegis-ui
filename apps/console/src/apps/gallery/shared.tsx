import { type ReactNode, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
  CheckGrid,
  type LinkComponent,
  MetricLabel,
  useTheme,
} from '@lincyaw/aegis-ui';

import {
  GALLERY_CHECK_ROWS,
  GALLERY_CHECK_RUNS,
  type SpecimenProps,
} from './fixtures';

/* ── Static specimen data ──────────────────────────────────────────── */

/** The adapter a routed app passes as `linkComponent`: links navigate through the router. */
export const GalleryRouterLink: LinkComponent = ({
  to,
  className,
  'aria-current': ariaCurrent,
  children,
}) => (
  <RouterLink to={to} className={className} aria-current={ariaCurrent}>
    {children}
  </RouterLink>
);

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

export function Specimen({ caption, children, span = 1 }: SpecimenProps) {
  return (
    <div className={`gallery__specimen gallery__specimen--span-${span}`}>
      <div className='gallery__specimen-stage'>{children}</div>
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
