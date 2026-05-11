import type { ReactElement } from 'react';

import { AegisShell, ThemeToggle } from '@OperationsPAI/aegis-ui';
import { UserOutlined } from '@ant-design/icons';
import { BrowserRouter } from 'react-router-dom';

import { containersApp } from './apps/containers';
import { datasetsApp } from './apps/datasets';
import { galleryApp } from './apps/gallery';
import { portalApp } from './apps/portal';

export function ConsoleApp(): ReactElement {
  return (
    <BrowserRouter>
      <AegisShell
        brand={{ name: 'AegisLab', href: '/' }}
        apps={[portalApp, containersApp, datasetsApp, galleryApp]}
        fallbackPath="/"
        headerActions={<ThemeToggle />}
        user={{
          name: 'User',
          avatar: <UserOutlined />,
          menu: [
            { key: 'profile', label: 'Profile' },
            { key: 'logout', label: 'Sign out' },
          ],
        }}
      />
    </BrowserRouter>
  );
}
