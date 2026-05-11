import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { ConfigProvider, theme as antdTheme } from 'antd';

import './index.css';
import './layouts/PageWrapper.css';
import { PlaygroundApp } from './playground/App';
import './styles/fonts';
import { ThemeProvider } from './theme/ThemeProvider';
import { aegisTheme } from './theme/antdTheme';
import { useTheme } from './theme/useTheme';

function ThemedRoot(): React.ReactElement {
  const { resolved } = useTheme();
  const algorithm =
    resolved === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;
  return (
    <ConfigProvider theme={{ ...aegisTheme, algorithm }}>
      <PlaygroundApp />
    </ConfigProvider>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('aegis-ui playground: #root element not found');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  </StrictMode>,
);
