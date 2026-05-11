import { type ReactElement, useState } from 'react';

import { Popover } from 'antd';
import { useNavigate } from 'react-router-dom';

import type { AegisApp } from './types';

interface AppSwitcherProps {
  apps: AegisApp[];
  activeAppId?: string;
  onAppSwitch?: (appId: string) => void;
}

/**
 * Alibaba-Cloud-style app launcher. A 9-dot icon on the top-left anchors
 * a popover grid of every registered app — clicking one navigates to its
 * `basePath` and closes the popover.
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

  const visibleApps = apps.filter((app) => !app.hidden);

  const content = (
    <ul className="aegis-shell__app-list" role="menu">
      {visibleApps.map((app) => {
        const active = app.id === activeAppId;
        const cls = active
          ? 'aegis-shell__app-row aegis-shell__app-row--active'
          : 'aegis-shell__app-row';
        return (
          <li key={app.id} role="none">
            <button
              type="button"
              role="menuitem"
              className={cls}
              onClick={() => handlePick(app)}
            >
              <span className="aegis-shell__app-row-icon">{app.icon}</span>
              <span className="aegis-shell__app-row-body">
                <span className="aegis-shell__app-row-label">{app.label}</span>
                {app.description && (
                  <span className="aegis-shell__app-row-desc">
                    {app.description}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="rightTop"
      arrow={false}
      content={content}
      overlayClassName="aegis-shell__app-popover"
      destroyOnHidden
    >
      <button
        type="button"
        className="aegis-shell__app-launcher"
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
    </Popover>
  );
}
