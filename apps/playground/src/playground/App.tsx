import type { ReactElement } from 'react';

import { AegisShell, ThemeToggle } from '@OperationsPAI/aegis-ui';
import { UserOutlined } from '@ant-design/icons';
import { BrowserRouter } from 'react-router-dom';

import { galleryApp } from './apps/gallery';
import { portalApp } from './apps/portal';

export function PlaygroundApp(): ReactElement {
  return (
    <BrowserRouter>
      <AegisShell
        brand={{ name: 'AegisLab', href: '/' }}
        apps={[portalApp, galleryApp]}
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
