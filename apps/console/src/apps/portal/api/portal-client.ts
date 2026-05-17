import {
  AuthenticationApi,
  BlobApi,
  ConfigCenterApi,
  Configuration,
  ContainersApi,
  DatasetsApi,
  EvaluationsApi,
  ExecutionsApi,
  GroupsApi,
  InjectionsApi,
  LabelsApi,
  MetricsApi,
  NotificationApi,
  ObservationApi,
  ProjectsApi,
  ShareApi,
  SSOAdminApi,
  SSOClientsApi,
  TasksApi,
  TeamsApi,
  TracesApi,
} from '@lincyaw/portal';
import axios from 'axios';

import { readTokens } from '../../../auth/tokenStore';
import { getRuntimeConfig } from '../../../config/runtime';

const portalAxios = axios.create();

portalAxios.interceptors.request.use((req) => {
  const tokens = readTokens();
  if (tokens?.accessToken) {
    req.headers = req.headers ?? {};
    (req.headers as Record<string, string>).authorization =
      `Bearer ${tokens.accessToken}`;
  }
  return req;
});

// SDK paths already include `/api/v2/...`, so basePath is just the gateway
// origin. Empty string keeps requests same-origin (vite proxy in dev,
// co-located gateway in prod).
const basePath = getRuntimeConfig().gatewayUrl;

const config = new Configuration({
  basePath,
  accessToken: () => readTokens()?.accessToken ?? '',
});

export const authenticationApi = new AuthenticationApi(
  config,
  basePath,
  portalAxios
);
export const blobApi = new BlobApi(config, basePath, portalAxios);
export const configCenterApi = new ConfigCenterApi(
  config,
  basePath,
  portalAxios
);
export const containersApi = new ContainersApi(config, basePath, portalAxios);
export const datasetsApi = new DatasetsApi(config, basePath, portalAxios);
export const evaluationsApi = new EvaluationsApi(config, basePath, portalAxios);
export const executionsApi = new ExecutionsApi(config, basePath, portalAxios);
export const groupsApi = new GroupsApi(config, basePath, portalAxios);
export const injectionsApi = new InjectionsApi(config, basePath, portalAxios);
export const labelsApi = new LabelsApi(config, basePath, portalAxios);
export const metricsApi = new MetricsApi(config, basePath, portalAxios);
export const notificationsApi = new NotificationApi(
  config,
  basePath,
  portalAxios
);
export const observationApi = new ObservationApi(config, basePath, portalAxios);
export const projectsApi = new ProjectsApi(config, basePath, portalAxios);
export const shareApi = new ShareApi(config, basePath, portalAxios);
export const ssoAdminApi = new SSOAdminApi(config, basePath, portalAxios);
export const ssoClientsApi = new SSOClientsApi(config, basePath, portalAxios);
export const tasksApi = new TasksApi(config, basePath, portalAxios);
export const teamsApi = new TeamsApi(config, basePath, portalAxios);
export const tracesApi = new TracesApi(config, basePath, portalAxios);

export { portalAxios };

export type {
  Configuration,
  ConfigurationParameters,
  ProjectProjectResp,
  TaskResp,
  TraceTraceResp,
} from '@lincyaw/portal';
