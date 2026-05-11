import type { ReactNode } from 'react';

import { MetricLabel } from './MetricLabel';
import { PanelTitle } from './PanelTitle';
import './SettingsSection.css';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  const cls = ['aegis-settings-section', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <section className={cls}>
      <div className="aegis-settings-section__header">
        <PanelTitle size="base" as="h3">
          {title}
        </PanelTitle>
        {description && <MetricLabel>{description}</MetricLabel>}
      </div>
      <div className="aegis-settings-section__body">{children}</div>
    </section>
  );
}

export default SettingsSection;
