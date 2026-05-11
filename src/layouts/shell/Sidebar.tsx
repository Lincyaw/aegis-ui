import type { ReactElement } from 'react';

import { NavLink } from 'react-router-dom';

import type { AegisApp } from './types';

interface SidebarProps {
  activeApp: AegisApp | undefined;
}

/**
 * Per-app inner nav. The global app list lives in the header's
 * `AppSwitcher`, not here — sidebar only ever shows the current app.
 */
export function Sidebar({ activeApp }: SidebarProps): ReactElement | null {
  if (!activeApp?.sidebar || activeApp.sidebar.length === 0) {
    return null;
  }

  return (
    <aside className="aegis-shell__sidebar">
      <section className="aegis-shell__sidebar-section">
        <div className="aegis-shell__sidebar-heading">{activeApp.label}</div>
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
    </aside>
  );
}

function joinPath(base: string, rel: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const r = rel.startsWith('/') ? rel.slice(1) : rel;
  return r ? `${b}/${r}` : b;
}
