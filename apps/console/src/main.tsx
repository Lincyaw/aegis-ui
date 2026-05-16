import { type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/geist';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import {
  AgentmChannelProvider,
  getAegisTheme,
  ThemeProvider,
  useTheme,
} from '@lincyaw/aegis-ui';
import '@lincyaw/aegis-ui/style.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';

import { useChatStore } from './ai/chatStore';
import { ConsoleApp } from './App';
import './main.css';

const DEFAULT_AGENTM_GATEWAY_URL = 'ws://127.0.0.1:7777/agentm';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const agentmGatewayUrl =
  import.meta.env.VITE_AGENTM_GATEWAY_URL ?? DEFAULT_AGENTM_GATEWAY_URL;
const agentmToken = import.meta.env.VITE_AGENTM_TOKEN;

function MaybeAgentm({ children }: { children: ReactNode }): ReactNode {
  const { currentId, loadMessages } = useChatStore();
  // Why: remount provider on chatId switch so React `messages` state and
  // streamMap reset cleanly — the provider only seeds from initialMessages
  // via useState initializer.
  return (
    <AgentmChannelProvider
      key={currentId}
      channel={{
        url: agentmGatewayUrl,
        token: agentmToken,
        chatId: currentId,
      }}
      initialMessages={loadMessages(currentId)}
    >
      {children}
    </AgentmChannelProvider>
  );
}

function ThemedRoot(): React.ReactElement {
  const { resolved } = useTheme();
  return (
    <ConfigProvider theme={getAegisTheme(resolved)}>
      <AntdApp component={false}>
        <QueryClientProvider client={queryClient}>
          <MaybeAgentm>
            <ConsoleApp />
          </MaybeAgentm>
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
