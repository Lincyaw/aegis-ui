import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/geist';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/noto-sans-sc';
import '@fontsource/google-sans-code/400.css';
import '@fontsource/google-sans-code/500.css';
import { getAegisTheme, ThemeProvider, useTheme } from '@lincyaw/aegis-ui';
import '@lincyaw/aegis-ui/style.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';

import { ConsoleApp } from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function ThemedRoot(): React.ReactElement {
  const { resolved } = useTheme();
  return (
    <ConfigProvider theme={getAegisTheme(resolved)}>
      <AntdApp component='div'>
        <QueryClientProvider client={queryClient}>
          <ConsoleApp />
        </QueryClientProvider>
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
