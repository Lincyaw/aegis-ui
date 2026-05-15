export type EntityStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'restarting'
  | 'installing';

export interface MockProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  injectionCount: number;
  createdAt: string;
}

export interface MockSystem {
  code: string;
  name: string;
  description: string;
  chart: string;
  version: string;
  otelEndpoint: string;
  enabled: boolean;
  pedestalCount: number;
  lastInjectionAt: string;
  prereqs: Array<{ name: string; ok: boolean; note?: string }>;
  systemType: string;
  apps: string[];
}

export interface MockPedestal {
  id: string;
  systemCode: string;
  namespace: string;
  version: string;
  status: 'pending' | 'running' | 'restarting' | 'failed' | 'uninstalled';
  age: string;
  lastRestartAt: string;
  helmValues: string;
}

export interface MockContract {
  id: string;
  name: string;
  faultType: 'pod' | 'network' | 'http' | 'jvm' | 'stress' | 'dns' | 'time';
  family: string;
  targetKind: string;
  paramCount: number;
  lastUsedAt: string;
  spec: string;
  description: string;
}

export type NamespaceMode = 'specific' | 'auto' | 'auto-bootstrap';

export interface GuidedInjectionSpec {
  namespaceMode: NamespaceMode;
  namespace: string;
  systemCode: string;
  systemType: string;
  app: string;
  container: string;
  targetService: string;
  chaosType: string;
  install: boolean;
  readyTimeoutSec: number;
  durationSec: number;
  skipRestartPedestal: boolean;
  skipStaleCheck: boolean;
  // Type-specific knobs
  memType?: 'ram' | 'swap' | 'cache';
  memSize?: number;
  memWorker?: number;
  cpuLoad?: number;
  cpuWorker?: number;
  cpuCount?: number;
  direction?: 'to' | 'from' | 'both';
  latencyMs?: number;
  jitter?: number;
  correlation?: number;
  loss?: number;
  duplicate?: number;
  corrupt?: number;
  rate?: number;
  limit?: number;
  buffer?: number;
  route?: string;
  httpMethod?: string;
  bodyType?: 'json' | 'text' | 'xml';
  body?: string;
  replacePath?: string;
  replaceMethod?: string;
  returnCode?: number;
  domain?: string;
  timeOffset?: number;
  class?: string;
  method?: string;
  latencyDuration?: number;
  database?: string;
  table?: string;
  operation?: 'select' | 'insert' | 'update' | 'delete';
  returnType?: 'string' | 'int' | 'bool' | 'object' | 'null';
  returnOpt?: string;
  exceptionOpt?: string;
  mutatorConfig?: string;
}

export interface MockInjection {
  id: string;
  projectId: string;
  systemCode: string;
  contractId: string;
  taskId: string;
  traceId: string | null;
  blastRadius: 'pod' | 'service' | 'namespace';
  durationSec: number;
  intensity: number;
  status: EntityStatus;
  createdAt: string;
  name: string;
  spec?: GuidedInjectionSpec;
}

export interface MockInjectionTemplate {
  id: string;
  name: string;
  description: string;
  spec: GuidedInjectionSpec;
}

export interface MockStagedInjection {
  id: string;
  projectId: string;
  spec: GuidedInjectionSpec;
  addedAt: string;
}

export interface MockTask {
  id: string;
  kind: 'injection' | 'regression' | 'eval' | 'datapack';
  parentId: string | null;
  parentLabel: string;
  status: EntityStatus;
  startedAt: string;
  durationMs: number;
  logs: Array<{ ts: string; level: 'info' | 'warn' | 'error' | 'debug'; body: string }>;
}

export interface MockTrace {
  id: string;
  projectId: string;
  injectionId: string | null;
  rootOperation: string;
  durationMs: number;
  spanCount: number;
  startedAt: string;
}

export interface MockDataset {
  id: string;
  name: string;
  description: string;
  injectionIds: string[];
  fileCount: number;
  sizeMb: number;
  createdAt: string;
}

export interface MockLabel {
  id: string;
  name: string;
  color: string;
  count: number;
}

export interface MockContainer {
  id: string;
  name: string;
  image: string;
  algorithm: string;
  createdAt: string;
}

export interface MockRegressionCase {
  id: string;
  name: string;
  description: string;
  owner: string;
  passRate: number;
  lastStatus: 'pass' | 'fail' | 'running';
  lastRunAt: string;
}

export interface MockRegressionRun {
  id: string;
  caseId: string;
  systemCode: string;
  datasetId: string;
  status: EntityStatus;
  startedAt: string;
  durationMs: number;
  childTaskIds: string[];
  passes: number;
  fails: number;
}

export interface MockEvalCase {
  id: string;
  runId: string;
  injectionId: string;
  traceId: string;
  pattern: string;
  tier: 'tier-1' | 'tier-2';
  passed: boolean;
  score: number;
  trajectory: Array<{
    step: number;
    timestamp: string;
    actionType: 'tool_call' | 'internal' | 'message';
    action: string;
    thought?: string;
    observation?: string;
  }>;
}

export interface MockEvalRun {
  id: string;
  model: string;
  datasetId: string;
  nCases: number;
  status: EntityStatus;
  tier1Score: number;
  tier2Score: number;
  pathReachability: number;
  completionRate: number;
  startedAt: string;
  caseIds: string[];
}

export interface MockClusterCheck {
  id: string;
  name: string;
  status: 'ok' | 'warn' | 'fail' | 'checking';
  detail: string;
  action?: { label: string; kind: 'restart-pedestal' | 'reseed' | 'view-logs' };
}

export interface MockClusterEvent {
  ts: string;
  level: 'info' | 'warn' | 'error';
  body: string;
}

export interface MockStoreState {
  projects: MockProject[];
  systems: MockSystem[];
  pedestals: MockPedestal[];
  contracts: MockContract[];
  injections: MockInjection[];
  tasks: MockTask[];
  traces: MockTrace[];
  datasets: MockDataset[];
  labels: MockLabel[];
  containers: MockContainer[];
  regressionCases: MockRegressionCase[];
  regressionRuns: MockRegressionRun[];
  evalRuns: MockEvalRun[];
  evalCases: MockEvalCase[];
  clusterChecks: MockClusterCheck[];
  clusterEvents: MockClusterEvent[];
  injectionTemplates: MockInjectionTemplate[];
  stagedInjections: MockStagedInjection[];
  activeProjectId: string;
}
