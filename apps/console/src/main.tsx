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
import { App as AntdApp, ConfigProvider } from 'antd';

import { ConsoleApp } from './App';
import './main.css';

const DEFAULT_AGENTM_GATEWAY_URL = 'ws://127.0.0.1:7777/agentm';

const agentmGatewayUrl =
  import.meta.env.VITE_AGENTM_GATEWAY_URL ?? DEFAULT_AGENTM_GATEWAY_URL;
const agentmToken = import.meta.env.VITE_AGENTM_TOKEN;

const agentmChannel = { url: agentmGatewayUrl, token: agentmToken };

function MaybeAgentm({ children }: { children: ReactNode }): ReactNode {
  return (
    <AgentmChannelProvider channel={agentmChannel}>
      {children}
    </AgentmChannelProvider>
  );
}

function ThemedRoot(): React.ReactElement {
  const { resolved } = useTheme();
  return (
    <ConfigProvider theme={getAegisTheme(resolved)}>
      <AntdApp component={false}>
        <MaybeAgentm>
          <ConsoleApp />
        </MaybeAgentm>
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
