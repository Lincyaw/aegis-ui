import { AppstoreOutlined } from '@ant-design/icons';

import type { AegisApp } from '../../../layouts/shell/types';
import Gallery from '../../Gallery';

export const galleryApp: AegisApp = {
  id: 'gallery',
  label: 'Component gallery',
  icon: <AppstoreOutlined />,
  basePath: '/gallery',
  description: 'Live specimen of every primitive shipped by aegis-ui.',
  routes: [{ path: '', element: <Gallery /> }],
};
