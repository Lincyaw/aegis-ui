import type { GuidedInjectionSpec } from '../../mocks/types';

export type FieldKey =
  | 'container'
  | 'memType'
  | 'memSize'
  | 'memWorker'
  | 'cpuLoad'
  | 'cpuWorker'
  | 'cpuCount'
  | 'direction'
  | 'latencyMs'
  | 'jitter'
  | 'correlation'
  | 'loss'
  | 'duplicate'
  | 'corrupt'
  | 'rate'
  | 'limit'
  | 'buffer'
  | 'route'
  | 'httpMethod'
  | 'targetService'
  | 'bodyType'
  | 'body'
  | 'replacePath'
  | 'replaceMethod'
  | 'returnCode'
  | 'domain'
  | 'timeOffset'
  | 'latencyDuration'
  | 'class'
  | 'method'
  | 'database'
  | 'table'
  | 'operation'
  | 'returnType'
  | 'returnOpt'
  | 'exceptionOpt'
  | 'mutatorConfig';

export interface FaultFamily {
  id: 'pod' | 'stress' | 'http' | 'dns' | 'time' | 'network' | 'jvm';
  label: string;
  description: string;
}

export const FAMILIES: FaultFamily[] = [
  {
    id: 'pod',
    label: 'Pod / Container',
    description: 'Kill / fail / restart pods or containers.',
  },
  {
    id: 'stress',
    label: 'Stress',
    description: 'CPU / memory pressure via stress-ng.',
  },
  {
    id: 'http',
    label: 'HTTP',
    description: 'Intercept HTTP at proxy — abort / delay / mutate.',
  },
  {
    id: 'dns',
    label: 'DNS',
    description: 'NXDOMAIN or random IP for selected hosts.',
  },
  { id: 'time', label: 'Time', description: 'Skew clock inside container.' },
  {
    id: 'network',
    label: 'Network',
    description: 'tc-netem delay / loss / corrupt / bandwidth.',
  },
  {
    id: 'jvm',
    label: 'JVM',
    description: 'byteman-style method-level faults for Java apps.',
  },
];

export interface ChaosTypeDef {
  name: string;
  family: FaultFamily['id'];
  description: string;
  fields: FieldKey[];
  blastHint: 'pod' | 'service' | 'namespace';
}

export const CHAOS_TYPES: ChaosTypeDef[] = [
  // Pod
  {
    name: 'PodKill',
    family: 'pod',
    description: 'Hard delete the pod.',
    fields: ['container'],
    blastHint: 'pod',
  },
  {
    name: 'PodFailure',
    family: 'pod',
    description: 'Mark pod unready for the duration.',
    fields: ['container'],
    blastHint: 'pod',
  },
  {
    name: 'ContainerKill',
    family: 'pod',
    description: 'Kill a specific container in the pod.',
    fields: ['container'],
    blastHint: 'pod',
  },
  // Stress
  {
    name: 'MemoryStress',
    family: 'stress',
    description: 'Allocate memory until target.',
    fields: ['memType', 'memSize', 'memWorker'],
    blastHint: 'pod',
  },
  {
    name: 'CPUStress',
    family: 'stress',
    description: 'Pin CPU at load%.',
    fields: ['cpuLoad', 'cpuWorker', 'cpuCount'],
    blastHint: 'pod',
  },
  // HTTP
  {
    name: 'HTTPRequestAbort',
    family: 'http',
    description: 'Abort incoming requests at proxy.',
    fields: ['route', 'httpMethod', 'targetService'],
    blastHint: 'service',
  },
  {
    name: 'HTTPResponseAbort',
    family: 'http',
    description: 'Abort responses at proxy.',
    fields: ['route', 'httpMethod', 'targetService'],
    blastHint: 'service',
  },
  {
    name: 'HTTPRequestDelay',
    family: 'http',
    description: 'Delay requests by N ms.',
    fields: [
      'route',
      'httpMethod',
      'targetService',
      'latencyMs',
      'latencyDuration',
    ],
    blastHint: 'service',
  },
  {
    name: 'HTTPResponseDelay',
    family: 'http',
    description: 'Delay responses by N ms.',
    fields: [
      'route',
      'httpMethod',
      'targetService',
      'latencyMs',
      'latencyDuration',
    ],
    blastHint: 'service',
  },
  {
    name: 'HTTPResponseReplaceBody',
    family: 'http',
    description: 'Replace whole response body.',
    fields: ['route', 'httpMethod', 'targetService', 'bodyType', 'body'],
    blastHint: 'service',
  },
  {
    name: 'HTTPResponsePatchBody',
    family: 'http',
    description: 'Patch part of response body.',
    fields: ['route', 'httpMethod', 'targetService', 'bodyType', 'body'],
    blastHint: 'service',
  },
  {
    name: 'HTTPRequestReplacePath',
    family: 'http',
    description: 'Rewrite request path.',
    fields: ['route', 'httpMethod', 'targetService', 'replacePath'],
    blastHint: 'service',
  },
  {
    name: 'HTTPRequestReplaceMethod',
    family: 'http',
    description: 'Rewrite HTTP method.',
    fields: ['route', 'targetService', 'replaceMethod'],
    blastHint: 'service',
  },
  {
    name: 'HTTPResponseReplaceCode',
    family: 'http',
    description: 'Force a synthetic status code.',
    fields: ['route', 'httpMethod', 'targetService', 'returnCode'],
    blastHint: 'service',
  },
  // DNS
  {
    name: 'DNSError',
    family: 'dns',
    description: 'NXDOMAIN for hosts.',
    fields: ['domain'],
    blastHint: 'service',
  },
  {
    name: 'DNSRandom',
    family: 'dns',
    description: 'Return random IPs for hosts.',
    fields: ['domain'],
    blastHint: 'service',
  },
  // Time
  {
    name: 'TimeSkew',
    family: 'time',
    description: 'Offset clock by seconds.',
    fields: ['timeOffset'],
    blastHint: 'pod',
  },
  // Network
  {
    name: 'NetworkDelay',
    family: 'network',
    description: 'Add egress/ingress latency.',
    fields: ['direction', 'latencyMs', 'jitter', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkLoss',
    family: 'network',
    description: 'Drop a % of packets.',
    fields: ['direction', 'loss', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkDuplicate',
    family: 'network',
    description: 'Duplicate a % of packets.',
    fields: ['direction', 'duplicate', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkCorrupt',
    family: 'network',
    description: 'Corrupt a % of packets.',
    fields: ['direction', 'corrupt', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkBandwidth',
    family: 'network',
    description: 'Cap link bandwidth.',
    fields: ['direction', 'rate', 'limit', 'buffer'],
    blastHint: 'service',
  },
  {
    name: 'NetworkPartition',
    family: 'network',
    description: 'Sever traffic.',
    fields: ['direction'],
    blastHint: 'namespace',
  },
  // JVM
  {
    name: 'JVMLatency',
    family: 'jvm',
    description: 'Add latency before method return.',
    fields: ['class', 'method', 'latencyMs', 'database', 'table'],
    blastHint: 'pod',
  },
  {
    name: 'JVMReturn',
    family: 'jvm',
    description: 'Force a return value.',
    fields: ['class', 'method', 'returnType', 'returnOpt'],
    blastHint: 'pod',
  },
  {
    name: 'JVMException',
    family: 'jvm',
    description: 'Throw an exception from method.',
    fields: ['class', 'method', 'exceptionOpt'],
    blastHint: 'pod',
  },
  {
    name: 'JVMGarbageCollector',
    family: 'jvm',
    description: 'Trigger heavy GC.',
    fields: ['class', 'method'],
    blastHint: 'pod',
  },
  {
    name: 'JVMCPUStress',
    family: 'jvm',
    description: 'CPU stress inside JVM.',
    fields: ['class', 'cpuLoad', 'cpuWorker'],
    blastHint: 'pod',
  },
  {
    name: 'JVMMemoryStress',
    family: 'jvm',
    description: 'Allocate to fill heap.',
    fields: ['class', 'memType', 'memSize'],
    blastHint: 'pod',
  },
  {
    name: 'JVMMySQLLatency',
    family: 'jvm',
    description: 'Slow a MySQL op.',
    fields: ['database', 'table', 'operation', 'latencyMs'],
    blastHint: 'pod',
  },
  {
    name: 'JVMMySQLException',
    family: 'jvm',
    description: 'Throw on a MySQL op.',
    fields: ['database', 'table', 'operation', 'exceptionOpt'],
    blastHint: 'pod',
  },
  {
    name: 'JVMRuntimeMutator',
    family: 'jvm',
    description: 'Generic runtime mutator (YAML config).',
    fields: ['class', 'method', 'mutatorConfig'],
    blastHint: 'pod',
  },
];

export const CHAOS_BY_NAME: Record<string, ChaosTypeDef> = Object.fromEntries(
  CHAOS_TYPES.map((c) => [c.name, c])
);

export const REQUIRED_FIELDS: Record<FieldKey, boolean> = {
  container: false,
  memType: true,
  memSize: true,
  memWorker: true,
  cpuLoad: true,
  cpuWorker: true,
  cpuCount: false,
  direction: true,
  latencyMs: true,
  jitter: false,
  correlation: false,
  loss: true,
  duplicate: true,
  corrupt: true,
  rate: true,
  limit: false,
  buffer: false,
  route: true,
  httpMethod: true,
  targetService: false,
  bodyType: true,
  body: true,
  replacePath: true,
  replaceMethod: true,
  returnCode: true,
  domain: true,
  timeOffset: true,
  latencyDuration: false,
  class: true,
  method: true,
  database: true,
  table: false,
  operation: true,
  returnType: true,
  returnOpt: false,
  exceptionOpt: true,
  mutatorConfig: true,
};

export function defaultSpec(projectSystemCode: string): GuidedInjectionSpec {
  return {
    namespaceMode: 'auto',
    namespace: '',
    systemCode: projectSystemCode,
    systemType: '',
    app: '',
    container: '',
    targetService: '',
    chaosType: '',
    install: false,
    readyTimeoutSec: 180,
    durationSec: 60,
    skipRestartPedestal: false,
    skipStaleCheck: false,
  };
}

export function isStepValid(step: number, spec: GuidedInjectionSpec): boolean {
  if (step === 0) {
    if (!spec.systemCode || !spec.app) return false;
    if (spec.namespaceMode === 'specific' && !spec.namespace.trim())
      return false;
    return true;
  }
  if (step === 1) {
    return !!spec.chaosType;
  }
  if (step === 2) {
    const def = CHAOS_BY_NAME[spec.chaosType];
    if (!def) return false;
    for (const f of def.fields) {
      if (!REQUIRED_FIELDS[f]) continue;
      const v = (spec as unknown as Record<string, unknown>)[f];
      if (v === undefined || v === '' || v === null) return false;
    }
    return true;
  }
  if (step === 3) {
    return spec.durationSec > 0;
  }
  return true;
}

export function specToYaml(spec: GuidedInjectionSpec): string {
  const lines: string[] = [];
  const push = (k: string, v: unknown) => {
    if (v === undefined || v === '' || v === null) return;
    if (typeof v === 'string' && v.includes('\n')) {
      lines.push(`${k}: |`);
      for (const ln of v.split('\n')) lines.push(`  ${ln}`);
    } else {
      lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    }
  };
  const ordered: Array<[string, unknown]> = [
    ['namespace_mode', spec.namespaceMode],
    ['namespace', spec.namespace],
    ['system', spec.systemCode],
    ['system_type', spec.systemType],
    ['app', spec.app],
    ['container', spec.container],
    ['target_service', spec.targetService],
    ['chaos_type', spec.chaosType],
    ['duration_sec', spec.durationSec],
    ['install', spec.install],
    ['ready_timeout_sec', spec.install ? spec.readyTimeoutSec : undefined],
    ['skip_restart_pedestal', spec.skipRestartPedestal],
    ['skip_stale_check', spec.skipStaleCheck],
    ['mem_type', spec.memType],
    ['mem_size', spec.memSize],
    ['mem_worker', spec.memWorker],
    ['cpu_load', spec.cpuLoad],
    ['cpu_worker', spec.cpuWorker],
    ['cpu_count', spec.cpuCount],
    ['direction', spec.direction],
    ['latency_ms', spec.latencyMs],
    ['jitter', spec.jitter],
    ['correlation', spec.correlation],
    ['loss', spec.loss],
    ['duplicate', spec.duplicate],
    ['corrupt', spec.corrupt],
    ['rate', spec.rate],
    ['limit', spec.limit],
    ['buffer', spec.buffer],
    ['route', spec.route],
    ['http_method', spec.httpMethod],
    ['body_type', spec.bodyType],
    ['body', spec.body],
    ['replace_path', spec.replacePath],
    ['replace_method', spec.replaceMethod],
    ['return_code', spec.returnCode],
    ['domain', spec.domain],
    ['time_offset', spec.timeOffset],
    ['latency_duration', spec.latencyDuration],
    ['class', spec.class],
    ['method', spec.method],
    ['database', spec.database],
    ['table', spec.table],
    ['operation', spec.operation],
    ['return_type', spec.returnType],
    ['return_opt', spec.returnOpt],
    ['exception_opt', spec.exceptionOpt],
    ['mutator_config', spec.mutatorConfig],
  ];
  for (const [k, v] of ordered) push(k, v);
  return lines.join('\n');
}
