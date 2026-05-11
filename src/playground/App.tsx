import { UserOutlined } from '@ant-design/icons';
import type { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AegisShell } from '../layouts/shell';

import { containersApp } from './apps/containers';
import { datasetsApp } from './apps/datasets';
import { galleryApp } from './apps/gallery';

export function PlaygroundApp(): ReactElement {
  return (
    <BrowserRouter>
      <AegisShell
        brand={{ name: 'aegis-ui', href: '/gallery' }}
        apps={[galleryApp, containersApp, datasetsApp]}
        fallbackPath="/gallery"
        user={{
          name: 'demo',
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
