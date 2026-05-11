import type { ReactNode } from 'react';

import './DangerZone.css';
import { MetricLabel } from './MetricLabel';
import { PanelTitle } from './PanelTitle';

interface DangerZoneProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function DangerZone({
  title = 'Danger zone',
  description,
  children,
  className,
}: DangerZoneProps) {
  const cls = ['aegis-danger-zone', className ?? ''].filter(Boolean).join(' ');

  return (
    <section className={cls}>
      <div className="aegis-danger-zone__header">
        <PanelTitle size="base" as="h3">
          {title}
        </PanelTitle>
        {description && <MetricLabel>{description}</MetricLabel>}
      </div>
      <div className="aegis-danger-zone__body">{children}</div>
    </section>
  );
}

export default DangerZone;
