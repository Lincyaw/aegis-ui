import { CloudOutlined } from '@ant-design/icons';

import type { AegisApp } from '@OperationsPAI/aegis-ui';

import BlobBrowser from './BlobBrowser';

export const blobApp: AegisApp = {
  id: 'blob',
  label: 'Blob',
  icon: <CloudOutlined />,
  basePath: '/blob',
  description: 'Object storage browser backed by aegis-blob.',
  sidebar: [
    {
      items: [{ to: '', label: 'Browser', end: true }],
    },
  ],
  routes: [{ path: '', element: <BlobBrowser /> }],
};
