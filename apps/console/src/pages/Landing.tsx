import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { Chip, PageHeader, useAuth } from '@lincyaw/aegis-ui';

import { getRuntimeConfig } from '../config/runtime';
import { registeredApps } from '../registry';

import './Landing.css';

export function Landing(): ReactElement {
  const { status, user } = useAuth();
  const cfg = getRuntimeConfig();
  const needsClickhouse = !cfg.clickhouseUrl;

  const apps = registeredApps.filter((a) => {
    if (a.hidden) {
      return false;
    }
    if (a.requiresAuth !== false && status !== 'authenticated') {
      return false;
    }
    if (a.requiredRoles && a.requiredRoles.length > 0) {
      const roles = user?.roles ?? [];
      if (!a.requiredRoles.some((r) => roles.includes(r))) {
        return false;
      }
    }
    return true;
  });

  return (
    <>
      <PageHeader
        title='Welcome to AegisLab Console'
        description={
          status === 'authenticated' && user?.name
            ? `Signed in as ${String(user.name)}. Pick a workspace to enter.`
            : 'Pick a workspace to enter. Some apps require sign-in.'
        }
        action={
          <Link to='/settings/endpoints' style={{ textDecoration: 'none' }}>
            <Chip tone='ghost'>Endpoints</Chip>
          </Link>
        }
      />

      {needsClickhouse && (
        <div className='landing-config-hint'>
          <Chip tone='warning'>ClickHouse not configured</Chip>
          <Link
            to='/settings/endpoints'
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--fs-13)',
              color: 'var(--text-muted)',
            }}
          >
            Configure in Settings → Endpoints
          </Link>
        </div>
      )}

      <div className='landing-grid'>
        {apps.map((app) => (
          <Link key={app.id} to={app.basePath} className='landing-card'>
            <div className='landing-card__head'>
              <span className='landing-card__icon'>{app.icon}</span>
              <span>{app.label}</span>
            </div>
            <div className='landing-card__desc'>
              {app.description ?? 'Open this workspace.'}
            </div>
            <span className='landing-card__cta'>Open</span>
          </Link>
        ))}
      </div>
    </>
  );
}

export default Landing;
