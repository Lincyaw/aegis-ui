import type { ReactNode } from 'react';

import { AppstoreOutlined } from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

import Gallery from './Gallery';
import { GalleryLocaleProvider, GalleryLocaleSwitch } from './locale';

function wrapGallery(children: ReactNode): ReactNode {
  return <GalleryLocaleProvider>{children}</GalleryLocaleProvider>;
}

export const galleryApp: AegisApp = {
  id: 'gallery',
  label: 'Component gallery',
  icon: <AppstoreOutlined />,
  basePath: '/gallery',
  description: 'Live specimen of every primitive shipped by aegis-ui.',
  requiresAuth: false,
  header: <GalleryLocaleSwitch />,
  wrap: wrapGallery,
  routes: [{ path: '', element: <Gallery /> }],
};
