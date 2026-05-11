import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import { ThemeProvider, aegisTheme, useTheme } from '@OperationsPAI/aegis-ui';
import '@OperationsPAI/aegis-ui/style.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import { ConfigProvider, theme as antdTheme } from 'antd';

import { ConsoleApp } from './App';

function ThemedRoot(): React.ReactElement {
  const { resolved } = useTheme();
  const algorithm =
    resolved === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;
  return (
    <ConfigProvider theme={{ ...aegisTheme, algorithm }}>
      <ConsoleApp />
    </ConfigProvider>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('aegis-ui console: #root element not found');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  </StrictMode>,
);
