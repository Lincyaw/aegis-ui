import { type ReactElement, useEffect, useState } from 'react';

import {
  CloudServerOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import {
  type AegisApp,
  type EnvironmentChangedEventDetail,
  ENVIRONMENT_CHANGED_EVENT,
  KeyValueList,
  MetricLabel,
  MonoValue,
  Panel,
  PanelTitle,
  StatusDot,
  useCurrentEnvironment,
} from '@OperationsPAI/aegis-ui';

function EnvDemoPage({ appLabel }: { appLabel: string }): ReactElement {
  const env = useCurrentEnvironment();
  const [lastEvent, setLastEvent] =
    useState<EnvironmentChangedEventDetail | null>(null);

  useEffect(() => {
    function onChange(e: Event): void {
      const detail = (e as CustomEvent<EnvironmentChangedEventDetail>).detail;
      setLastEvent(detail);
    }
    window.addEventListener(ENVIRONMENT_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(ENVIRONMENT_CHANGED_EVENT, onChange);
    };
  }, []);

  return (
    <Panel
      title={<PanelTitle size='lg'>{appLabel}</PanelTitle>}
      extra={<MetricLabel>environment discovery demo</MetricLabel>}
    >
      <p>
        This page reads <code>useCurrentEnvironment()</code> and listens for
        the <code>app.environmentChanged</code> runtime event. Switch
        environments using the dropdown in the top header and watch this
        page react.
      </p>
      <KeyValueList
        items={[
          {
            k: 'currentEnv.id',
            v: (
              <span data-testid='env-current-id'>
                <StatusDot tone={env ? 'ink' : 'muted'} />{' '}
                <MonoValue>{env?.id ?? '(none)'}</MonoValue>
              </span>
            ),
          },
          {
            k: 'currentEnv.label',
            v: <MonoValue>{env?.label ?? '(none)'}</MonoValue>,
          },
          {
            k: 'currentEnv.baseUrl',
            v: (
              <MonoValue data-testid='env-current-baseurl'>
                {env?.baseUrl ?? '(none)'}
              </MonoValue>
            ),
          },
          {
            k: 'last app.environmentChanged',
            v: (
              <MonoValue data-testid='env-last-event'>
                {lastEvent
                  ? `${lastEvent.fromEnvId ?? 'null'} → ${lastEvent.toEnvId} (app=${lastEvent.appId})`
                  : '(no switch yet)'}
              </MonoValue>
            ),
          },
        ]}
      />
    </Panel>
  );
}

/**
 * Two demo apps, each pointing at a different manifest seed URL. They share
 * the same page implementation — what differs is `apiBaseUrl`, which the
 * shell uses to fetch the manifest.
 */
export const envDemoAlphaApp: AegisApp = {
  id: 'env-demo-alpha',
  label: 'Env demo · Alpha backend',
  icon: <DeploymentUnitOutlined />,
  basePath: '/env-demo/alpha',
  description: 'Verifies env switcher against backend A.',
  requiresAuth: false,
  apiBaseUrl: 'http://127.0.0.1:18081',
  routes: [
    { path: '', element: <EnvDemoPage appLabel='Alpha backend' /> },
  ],
};

export const envDemoBravoApp: AegisApp = {
  id: 'env-demo-bravo',
  label: 'Env demo · Bravo backend',
  icon: <CloudServerOutlined />,
  basePath: '/env-demo/bravo',
  description: 'Verifies env switcher against backend B.',
  requiresAuth: false,
  apiBaseUrl: 'http://127.0.0.1:18082',
  routes: [
    { path: '', element: <EnvDemoPage appLabel='Bravo backend' /> },
  ],
};

/**
 * App with no `apiBaseUrl` — proves the switcher hides when the manifest
 * is unavailable. Renders the same demo page so the assertion is visible.
 */
export const envDemoNoneApp: AegisApp = {
  id: 'env-demo-none',
  label: 'Env demo · No manifest',
  icon: <ExperimentOutlined />,
  basePath: '/env-demo/none',
  description: 'No apiBaseUrl — switcher should be hidden.',
  requiresAuth: false,
  routes: [
    { path: '', element: <EnvDemoPage appLabel='No-manifest app' /> },
  ],
};
