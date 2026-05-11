import { type ReactElement, useState } from 'react';

import { Modal } from 'antd';
import { useNavigate } from 'react-router-dom';

import type { AegisApp } from './types';

interface AppSwitcherProps {
  apps: AegisApp[];
  activeAppId?: string;
  onAppSwitch?: (appId: string) => void;
}

/**
 * Alibaba-Cloud-style app launcher. A 9-dot icon on the top-left opens a
 * modal grid that lists every registered app — clicking one navigates to
 * its `basePath` and closes the modal.
 */
export function AppSwitcher({
  apps,
  activeAppId,
  onAppSwitch,
}: AppSwitcherProps): ReactElement {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handlePick = (app: AegisApp): void => {
    setOpen(false);
    onAppSwitch?.(app.id);
    navigate(app.basePath);
  };

  return (
    <>
      <button
        type="button"
        className="aegis-shell__app-launcher"
        onClick={() => setOpen(true)}
        aria-label="Switch app"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="aegis-shell__app-launcher-glyph" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="4" cy="4" r="1.5" />
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="16" cy="4" r="1.5" />
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="16" cy="10" r="1.5" />
            <circle cx="4" cy="16" r="1.5" />
            <circle cx="10" cy="16" r="1.5" />
            <circle cx="16" cy="16" r="1.5" />
          </svg>
        </span>
      </button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        title="Switch app"
        width={640}
        destroyOnHidden
      >
        <div className="aegis-shell__app-grid">
          {apps.map((app) => {
            const active = app.id === activeAppId;
            const cls = active
              ? 'aegis-shell__app-card aegis-shell__app-card--active'
              : 'aegis-shell__app-card';
            return (
              <button
                key={app.id}
                type="button"
                className={cls}
                onClick={() => handlePick(app)}
              >
                <span className="aegis-shell__app-card-icon">{app.icon}</span>
                <span className="aegis-shell__app-card-body">
                  <span className="aegis-shell__app-card-label">
                    {app.label}
                  </span>
                  {app.description && (
                    <span className="aegis-shell__app-card-desc">
                      {app.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
