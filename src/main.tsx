import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { ConfigProvider } from 'antd';

import './index.css';
import './layouts/PageWrapper.css';
import { PlaygroundApp } from './playground/App';
import './styles/fonts';
import { aegisTheme } from './theme/antdTheme';

const container = document.getElementById('root');
if (!container) {
  throw new Error('aegis-ui playground: #root element not found');
}

createRoot(container).render(
  <StrictMode>
    <ConfigProvider theme={aegisTheme}>
      <PlaygroundApp />
    </ConfigProvider>
  </StrictMode>,
);
