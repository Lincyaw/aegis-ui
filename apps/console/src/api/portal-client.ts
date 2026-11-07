import {
  AuthenticationApi,
  ClusterApi,
  Configuration,
  ContainersApi,
  DatasetsApi,
  EvaluationsApi,
  ExecutionsApi,
  InjectionsApi,
  LabelsApi,
  PagesApi,
  PedestalApi,
  ProjectsApi,
  SystemsApi,
  TasksApi,
  TeamsApi,
  TracesApi,
} from '@lincyaw/portal';
import axios, { type InternalAxiosRequestConfig, isAxiosError } from 'axios';

import {
  getAccessToken,
  renewAfterUnauthorized,
  unauthorizedWithoutToken,
} from '../auth/session';
import { getRuntimeConfig } from '../config/runtime';

interface PortalRequestConfig extends InternalAxiosRequestConfig {
  retriedAfterUnauthorized?: boolean;
}

const BEARER_PREFIX = 'Bearer ';

const portalAxios = axios.create();

portalAxios.interceptors.request.use(async (req) => {
  req.baseURL = getRuntimeConfig().gatewayUrl || undefined;
  const token = await getAccessToken();
  if (token) {
    req.headers.set('authorization', `${BEARER_PREFIX}${token}`);
  }
  return req;
});

portalAxios.interceptors.response.use(undefined, async (error: unknown) => {
  if (!isAxiosError(error) || error.response?.status !== 401 || !error.config) {
    throw error;
  }
  const failed: PortalRequestConfig = error.config;
  const sent = String(failed.headers.get('authorization') ?? '');
  if (failed.retriedAfterUnauthorized) {
    throw error;
  }
  if (!sent.startsWith(BEARER_PREFIX)) {
    unauthorizedWithoutToken();
    throw error;
  }
  const renewed = await renewAfterUnauthorized(
    sent.slice(BEARER_PREFIX.length)
  );
  if (!renewed) {
    throw error;
  }
  const retry: PortalRequestConfig = {
    ...failed,
    retriedAfterUnauthorized: true,
  };
  return portalAxios.request(retry);
});

// SDK paths already include `/api/v2/...`. An empty basePath keeps them
// relative, so the request interceptor points each one at the gateway
// configured when it is sent (empty = same origin: vite proxy in dev,
// co-located gateway in prod).
const basePath = '';

const config = new Configuration({ basePath });

export const authenticationApi = new AuthenticationApi(
  config,
  basePath,
  portalAxios
);
export const clusterApi = new ClusterApi(config, basePath, portalAxios);
export const containersApi = new ContainersApi(config, basePath, portalAxios);
export const datasetsApi = new DatasetsApi(config, basePath, portalAxios);
export const evaluationsApi = new EvaluationsApi(config, basePath, portalAxios);
export const executionsApi = new ExecutionsApi(config, basePath, portalAxios);
export const injectionsApi = new InjectionsApi(config, basePath, portalAxios);
export const labelsApi = new LabelsApi(config, basePath, portalAxios);
export const pagesApi = new PagesApi(config, basePath, portalAxios);
export const pedestalApi = new PedestalApi(config, basePath, portalAxios);
export const projectsApi = new ProjectsApi(config, basePath, portalAxios);
export const systemsApi = new SystemsApi(config, basePath, portalAxios);
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
