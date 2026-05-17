import { FileTextOutlined } from '@ant-design/icons';
import type { AegisApp } from '@lincyaw/aegis-ui';

import PageDetail from './pages/PageDetail';
import PagesList from './pages/PagesList';
import PagesNew from './pages/PagesNew';
import PagesPublic from './pages/PagesPublic';

export const pagesApp: AegisApp = {
  id: 'pages',
  label: 'Pages',
  icon: <FileTextOutlined />,
  basePath: '/pages',
  description:
    'Static-site rendering from blob: upload a folder of markdown, get a share URL.',
  sidebar: [
    {
      items: [
        { to: '', label: 'My pages', end: true },
        { to: 'public', label: 'Public' },
        { to: 'new', label: 'New' },
      ],
    },
  ],
  routes: [
    { path: '', element: <PagesList /> },
    { path: 'public', element: <PagesPublic /> },
    { path: 'new', element: <PagesNew /> },
    { path: ':id', element: <PageDetail /> },
  ],
};
