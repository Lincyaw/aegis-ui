import { ConfigProvider } from 'antd';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import './styles/fonts';
import './layouts/PageWrapper.css';
import { aegisTheme } from './theme/antdTheme';
import { PlaygroundApp } from './playground/App';

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
