import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';

import type { AegisApp } from './types';

interface SidebarProps {
  apps: AegisApp[];
  activeApp: AegisApp | undefined;
  onAppSwitch?: (appId: string) => void;
}

export function Sidebar({
  apps,
  activeApp,
  onAppSwitch,
}: SidebarProps): ReactElement {
  return (
    <aside className="aegis-shell__sidebar">
      <section className="aegis-shell__sidebar-section">
        <div className="aegis-shell__sidebar-heading">Apps</div>
        {apps.map((app) => (
          <NavLink
            key={app.id}
            to={app.basePath}
            onClick={() => onAppSwitch?.(app.id)}
            className={({ isActive }) =>
              [
                'aegis-shell__nav-link',
                isActive ? 'aegis-shell__nav-link--active' : '',
              ]
                .filter(Boolean)
                .join(' ')
            }
          >
            <span className="aegis-shell__nav-icon">{app.icon}</span>
            <span>{app.label}</span>
          </NavLink>
        ))}
      </section>

      {activeApp?.sidebar && activeApp.sidebar.length > 0 && (
        <section className="aegis-shell__sidebar-section">
          {activeApp.sidebar.map((group, idx) => (
            <div key={idx}>
              {group.label && (
                <div className="aegis-shell__sidebar-heading">{group.label}</div>
              )}
              {group.items.map((item) => {
                const path = joinPath(activeApp.basePath, item.to);
                return (
                  <NavLink
                    key={path}
                    to={path}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'aegis-shell__nav-link',
                        isActive ? 'aegis-shell__nav-link--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                  >
                    {item.icon && (
                      <span className="aegis-shell__nav-icon">{item.icon}</span>
                    )}
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </section>
      )}
    </aside>
  );
}

function joinPath(base: string, rel: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const r = rel.startsWith('/') ? rel.slice(1) : rel;
  return r ? `${b}/${r}` : b;
}
