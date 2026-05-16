import { CloudOutlined } from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

import BucketBrowser from './pages/BucketBrowser';
import BucketsOverview from './pages/BucketsOverview';
import SharesPage from './pages/SharesPage';

export const blobApp: AegisApp = {
  id: 'blob',
  label: 'Files',
  icon: <CloudOutlined />,
  basePath: '/blob',
  description: 'Object storage browser, uploader, and share-link manager.',
  sidebar: [
    {
      items: [
        { to: '', label: 'Buckets', end: true },
        { to: 'shares', label: 'My shares' },
      ],
    },
  ],
  routes: [
    { path: '', element: <BucketsOverview /> },
    { path: 'shares', element: <SharesPage /> },
    { path: ':bucket', element: <BucketBrowser /> },
  ],
};
