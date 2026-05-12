import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/geist';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import { getAegisTheme, ThemeProvider, useTheme } from '@lincyaw/aegis-ui';
import '@lincyaw/aegis-ui/style.css';
import { App as AntdApp, ConfigProvider } from 'antd';

import { ConsoleApp } from './App';
import './main.css';

function ThemedRoot(): React.ReactElement {
  const { resolved } = useTheme();
  return (
    <ConfigProvider theme={getAegisTheme(resolved)}>
      <AntdApp component={false}>
        <ConsoleApp />
      </AntdApp>
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
  </StrictMode>
);
