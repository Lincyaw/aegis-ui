import type {
  InjectionGuidedSpec,
  InjectionSubmitInjectionReq,
} from '@lincyaw/portal';

/**
 * The guided-injection wizard. `PARAM_FIELDS` is the one description of
 * every fault parameter — its form control, its range and the request field
 * it is sent as — so the form, the preview and the request cannot disagree.
 */

export type NamespaceMode = 'specific' | 'auto' | 'auto-bootstrap';

export type ParamKey =
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

export type ParamValue = string | number;

export interface GuidedInjectionSpec {
  namespaceMode: NamespaceMode;
  namespace: string;
  systemCode: string;
  systemType: string;
  app: string;
  container: string;
  targetService: string;
  chaosType: string;
  durationSec: number;
  skipRestartPedestal: boolean;
  params: Partial<Record<ParamKey, ParamValue>>;
}

type WireKey = keyof InjectionGuidedSpec;
type WireKeyOf<V> = {
  [K in WireKey]-?: NonNullable<InjectionGuidedSpec[K]> extends V ? K : never;
}[WireKey];
type NumberWireKey = WireKeyOf<number>;
type StringWireKey = WireKeyOf<string>;

interface FieldBase {
  label: string;
  required: boolean;
}

export interface NumberParamField extends FieldBase {
  kind: 'number';
  widget: 'input' | 'slider';
  wire: readonly NumberWireKey[];
  min: number;
  max: number;
  defaultValue?: number;
}

export interface TextParamField extends FieldBase {
  kind: 'text';
  widget: 'input' | 'yaml';
  wire: readonly StringWireKey[];
  placeholder?: string;
}

export interface ChoiceParamField extends FieldBase {
  kind: 'choice';
  widget: 'radio' | 'select';
  wire: readonly StringWireKey[];
  options: readonly string[];
  defaultValue?: string;
}

export type ParamField = NumberParamField | TextParamField | ChoiceParamField;

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];

export const PARAM_FIELDS: Record<ParamKey, ParamField> = {
  memType: {
    kind: 'choice',
    widget: 'radio',
    label: 'Memory type',
    wire: ['mem_type'],
    options: ['ram', 'swap', 'cache'],
    defaultValue: 'ram',
    required: true,
  },
  memSize: {
    kind: 'number',
    widget: 'input',
    label: 'Memory size (MiB)',
    wire: ['memory_size'],
    min: 1,
    max: 65536,
    required: true,
  },
  memWorker: {
    kind: 'number',
    widget: 'input',
    label: 'Memory workers',
    wire: ['mem_worker'],
    min: 1,
    max: 64,
    required: true,
  },
  cpuLoad: {
    kind: 'number',
    widget: 'slider',
    label: 'CPU load (%)',
    wire: ['cpu_load'],
    min: 0,
    max: 100,
    defaultValue: 50,
    required: true,
  },
  cpuWorker: {
    kind: 'number',
    widget: 'input',
    label: 'CPU workers',
    wire: ['cpu_worker'],
    min: 1,
    max: 64,
    required: true,
  },
  cpuCount: {
    kind: 'number',
    widget: 'input',
    label: 'CPU count',
    wire: ['cpu_count'],
    min: 0,
    max: 128,
    required: false,
  },
  direction: {
    kind: 'choice',
    widget: 'radio',
    label: 'Direction',
    wire: ['direction'],
    options: ['to', 'from', 'both'],
    defaultValue: 'to',
    required: true,
  },
  latencyMs: {
    kind: 'number',
    widget: 'input',
    label: 'Latency (ms)',
    wire: ['latency_ms'],
    min: 1,
    max: 600000,
    required: true,
  },
  jitter: {
    kind: 'number',
    widget: 'input',
    label: 'Jitter (ms)',
    wire: ['jitter'],
    min: 0,
    max: 60000,
    required: false,
  },
  correlation: {
    kind: 'number',
    widget: 'slider',
    label: 'Correlation (%)',
    wire: ['correlation'],
    min: 0,
    max: 100,
    defaultValue: 0,
    required: false,
  },
  loss: {
    kind: 'number',
    widget: 'slider',
    label: 'Loss (%)',
    wire: ['loss'],
    min: 0,
    max: 100,
    defaultValue: 0,
    required: true,
  },
  duplicate: {
    kind: 'number',
    widget: 'slider',
    label: 'Duplicate (%)',
    wire: ['duplicate'],
    min: 0,
    max: 100,
    defaultValue: 0,
    required: true,
  },
  corrupt: {
    kind: 'number',
    widget: 'slider',
    label: 'Corrupt (%)',
    wire: ['corrupt'],
    min: 0,
    max: 100,
    defaultValue: 0,
    required: true,
  },
  rate: {
    kind: 'number',
    widget: 'input',
    label: 'Rate (kbit/s)',
    wire: ['rate'],
    min: 1,
    max: 10_000_000,
    required: true,
  },
  limit: {
    kind: 'number',
    widget: 'input',
    label: 'Limit (bytes)',
    wire: ['limit'],
    min: 0,
    max: 1_000_000_000,
    required: false,
  },
  buffer: {
    kind: 'number',
    widget: 'input',
    label: 'Buffer (bytes)',
    wire: ['buffer'],
    min: 0,
    max: 1_000_000_000,
    required: false,
  },
  route: {
    kind: 'text',
    widget: 'input',
    label: 'Route',
    wire: ['route'],
    placeholder: '/api/checkout',
    required: true,
  },
  httpMethod: {
    kind: 'choice',
    widget: 'select',
    label: 'HTTP method',
    wire: ['http_method'],
    options: HTTP_METHODS,
    required: true,
  },
  replaceMethod: {
    kind: 'choice',
    widget: 'select',
    label: 'Replace method',
    wire: ['replace_method'],
    options: HTTP_METHODS,
    required: true,
  },
  returnCode: {
    kind: 'number',
    widget: 'input',
    label: 'HTTP return code',
    wire: ['status_code'],
    min: 100,
    max: 599,
    required: true,
  },
  domain: {
    kind: 'text',
    widget: 'input',
    label: 'Domain (host or regex)',
    wire: ['domain'],
    placeholder: 'auth.example.com',
    required: true,
  },
  timeOffset: {
    kind: 'number',
    widget: 'input',
    label: 'Time offset (seconds, signed)',
    wire: ['time_offset'],
    min: -86400,
    max: 86400,
    required: true,
  },
  latencyDuration: {
    kind: 'number',
    widget: 'input',
    label: 'Latency duration (s)',
    // Sent under both names: the SDK does not say which one the backend
    // reads for HTTP delays.
    wire: ['delay_duration', 'latency_duration'],
    min: 1,
    max: 3600,
    required: false,
  },
  class: {
    kind: 'text',
    widget: 'input',
    label: 'Java class',
    wire: ['class'],
    placeholder: 'com.example.UserService',
    required: true,
  },
  method: {
    kind: 'text',
    widget: 'input',
    label: 'Method',
    wire: ['method'],
    placeholder: 'login',
    required: true,
  },
  database: {
    kind: 'text',
    widget: 'input',
    label: 'MySQL database',
    wire: ['database'],
    required: true,
  },
  table: {
    kind: 'text',
    widget: 'input',
    label: 'MySQL table',
    wire: ['table'],
    required: false,
  },
  operation: {
    kind: 'choice',
    widget: 'select',
    label: 'Operation',
    wire: ['operation'],
    options: ['select', 'insert', 'update', 'delete'],
    required: true,
  },
  returnType: {
    kind: 'choice',
    widget: 'select',
    label: 'Return type',
    wire: ['return_type'],
    options: ['string', 'int', 'bool', 'object', 'null'],
    required: true,
  },
  returnOpt: {
    kind: 'text',
    widget: 'input',
    label: 'Return value',
    wire: ['return_value_opt'],
    placeholder: '"injected"',
    required: false,
  },
  exceptionOpt: {
    kind: 'text',
    widget: 'input',
    label: 'Exception expression',
    wire: ['exception_opt'],
    placeholder: 'java.lang.RuntimeException("aegis")',
    required: true,
  },
  mutatorConfig: {
    kind: 'text',
    widget: 'yaml',
    label: 'Mutator config (YAML)',
    wire: ['mutator_config'],
    required: true,
  },
};

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
    description: 'Intercept HTTP at proxy — abort / delay / rewrite.',
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
  params: ParamKey[];
  blastHint: 'pod' | 'service' | 'namespace';
}

export const CHAOS_TYPES: ChaosTypeDef[] = [
  {
    name: 'PodKill',
    family: 'pod',
    description: 'Hard delete the pod.',
    params: [],
    blastHint: 'pod',
  },
  {
    name: 'PodFailure',
    family: 'pod',
    description: 'Mark pod unready for the duration.',
    params: [],
    blastHint: 'pod',
  },
  {
    name: 'ContainerKill',
    family: 'pod',
    description: 'Kill a specific container in the pod.',
    params: [],
    blastHint: 'pod',
  },
  {
    name: 'MemoryStress',
    family: 'stress',
    description: 'Allocate memory until target.',
    params: ['memType', 'memSize', 'memWorker'],
    blastHint: 'pod',
  },
  {
    name: 'CPUStress',
    family: 'stress',
    description: 'Pin CPU at load%.',
    params: ['cpuLoad', 'cpuWorker', 'cpuCount'],
    blastHint: 'pod',
  },
  {
    name: 'HTTPRequestAbort',
    family: 'http',
    description: 'Abort incoming requests at proxy.',
    params: ['route', 'httpMethod'],
    blastHint: 'service',
  },
  {
    name: 'HTTPResponseAbort',
    family: 'http',
    description: 'Abort responses at proxy.',
    params: ['route', 'httpMethod'],
    blastHint: 'service',
  },
  {
    name: 'HTTPRequestDelay',
    family: 'http',
    description: 'Delay requests by N ms.',
    params: ['route', 'httpMethod', 'latencyMs', 'latencyDuration'],
    blastHint: 'service',
  },
  {
    name: 'HTTPResponseDelay',
    family: 'http',
    description: 'Delay responses by N ms.',
    params: ['route', 'httpMethod', 'latencyMs', 'latencyDuration'],
    blastHint: 'service',
  },
  {
    name: 'HTTPRequestReplaceMethod',
    family: 'http',
    description: 'Rewrite HTTP method.',
    params: ['route', 'replaceMethod'],
    blastHint: 'service',
  },
  {
    name: 'HTTPResponseReplaceCode',
    family: 'http',
    description: 'Force a synthetic status code.',
    params: ['route', 'httpMethod', 'returnCode'],
    blastHint: 'service',
  },
  {
    name: 'DNSError',
    family: 'dns',
    description: 'NXDOMAIN for hosts.',
    params: ['domain'],
    blastHint: 'service',
  },
  {
    name: 'DNSRandom',
    family: 'dns',
    description: 'Return random IPs for hosts.',
    params: ['domain'],
    blastHint: 'service',
  },
  {
    name: 'TimeSkew',
    family: 'time',
    description: 'Offset clock by seconds.',
    params: ['timeOffset'],
    blastHint: 'pod',
  },
  {
    name: 'NetworkDelay',
    family: 'network',
    description: 'Add egress/ingress latency.',
    params: ['direction', 'latencyMs', 'jitter', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkLoss',
    family: 'network',
    description: 'Drop a % of packets.',
    params: ['direction', 'loss', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkDuplicate',
    family: 'network',
    description: 'Duplicate a % of packets.',
    params: ['direction', 'duplicate', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkCorrupt',
    family: 'network',
    description: 'Corrupt a % of packets.',
    params: ['direction', 'corrupt', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkBandwidth',
    family: 'network',
    description: 'Cap link bandwidth.',
    params: ['direction', 'rate', 'limit', 'buffer'],
    blastHint: 'service',
  },
  {
    name: 'NetworkPartition',
    family: 'network',
    description: 'Sever traffic.',
    params: ['direction'],
    blastHint: 'namespace',
  },
  {
    name: 'JVMLatency',
    family: 'jvm',
    description: 'Add latency before method return.',
    params: ['class', 'method', 'latencyMs', 'database', 'table'],
    blastHint: 'pod',
  },
  {
    name: 'JVMReturn',
    family: 'jvm',
    description: 'Force a return value.',
    params: ['class', 'method', 'returnType', 'returnOpt'],
    blastHint: 'pod',
  },
  {
    name: 'JVMException',
    family: 'jvm',
    description: 'Throw an exception from method.',
    params: ['class', 'method', 'exceptionOpt'],
    blastHint: 'pod',
  },
  {
    name: 'JVMGarbageCollector',
    family: 'jvm',
    description: 'Trigger heavy GC.',
    params: ['class', 'method'],
    blastHint: 'pod',
  },
  {
    name: 'JVMCPUStress',
    family: 'jvm',
    description: 'CPU stress inside JVM.',
    params: ['class', 'cpuLoad', 'cpuWorker'],
    blastHint: 'pod',
  },
  {
    name: 'JVMMemoryStress',
    family: 'jvm',
    description: 'Allocate to fill heap.',
    params: ['class', 'memType', 'memSize'],
    blastHint: 'pod',
  },
  {
    name: 'JVMMySQLLatency',
    family: 'jvm',
    description: 'Slow a MySQL op.',
    params: ['database', 'table', 'operation', 'latencyMs'],
    blastHint: 'pod',
  },
  {
    name: 'JVMMySQLException',
    family: 'jvm',
    description: 'Throw on a MySQL op.',
    params: ['database', 'table', 'operation', 'exceptionOpt'],
    blastHint: 'pod',
  },
  {
    name: 'JVMRuntimeMutator',
    family: 'jvm',
    description: 'Generic runtime mutator (YAML config).',
    params: ['class', 'method', 'mutatorConfig'],
    blastHint: 'pod',
  },
];

export const CHAOS_BY_NAME: Partial<Record<string, ChaosTypeDef>> =
  Object.fromEntries(CHAOS_TYPES.map((c) => [c.name, c]));

export function defaultSpec(systemCode = ''): GuidedInjectionSpec {
  return {
    namespaceMode: 'auto',
    namespace: '',
    systemCode,
    systemType: '',
    app: '',
    container: '',
    targetService: '',
    chaosType: '',
    durationSec: 60,
    skipRestartPedestal: false,
    params: {},
  };
}

/** Switches the fault, keeping values its parameters share with the old one and defaulting the rest. */
export function withChaosType(
  spec: GuidedInjectionSpec,
  chaosType: string
): GuidedInjectionSpec {
  const params: Partial<Record<ParamKey, ParamValue>> = {};
  for (const key of CHAOS_BY_NAME[chaosType]?.params ?? []) {
    const field = PARAM_FIELDS[key];
    const value =
      spec.params[key] ??
      (field.kind === 'text' ? undefined : field.defaultValue);
    if (value !== undefined) {
      params[key] = value;
    }
  }
  return { ...spec, chaosType, params };
}

/** Why a parameter's value cannot be sent, or `undefined` when it can. */
export function paramProblem(
  field: ParamField,
  value: ParamValue | undefined
): string | undefined {
  if (value === undefined || value === '') {
    return field.required ? 'Required' : undefined;
  }
  if (field.kind === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 'Enter a number';
    }
    if (value < field.min || value > field.max) {
      return `Between ${String(field.min)} and ${String(field.max)}`;
    }
    return undefined;
  }
  if (field.kind === 'choice' && !field.options.includes(String(value))) {
    return `One of ${field.options.join(', ')}`;
  }
  return undefined;
}

export const WIZARD_STEPS = [
  'Target',
  'Chaos type',
  'Parameters',
  'Lifecycle',
  'Stage',
  'Review',
] as const;

export function isStepValid(step: number, spec: GuidedInjectionSpec): boolean {
  switch (step) {
    case 0:
      return (
        spec.systemCode !== '' &&
        spec.app !== '' &&
        (spec.namespaceMode !== 'specific' || spec.namespace.trim() !== '')
      );
    case 1:
      return CHAOS_BY_NAME[spec.chaosType] !== undefined;
    case 2:
      return (CHAOS_BY_NAME[spec.chaosType]?.params ?? []).every(
        (key) => paramProblem(PARAM_FIELDS[key], spec.params[key]) === undefined
      );
    case 3:
      return spec.durationSec > 0;
    default:
      return true;
  }
}

/** The first step that is not complete, or the step count when all are. */
export function firstInvalidStep(spec: GuidedInjectionSpec): number {
  const index = WIZARD_STEPS.findIndex((_, step) => !isStepValid(step, spec));
  return index === -1 ? WIZARD_STEPS.length : index;
}

export function toGuidedSpec(spec: GuidedInjectionSpec): InjectionGuidedSpec {
  const out: InjectionGuidedSpec = { duration: spec.durationSec };
  const text: Array<[StringWireKey, string]> = [
    ['system', spec.systemCode],
    ['system_type', spec.systemType],
    [
      'namespace',
      spec.namespaceMode === 'specific' ? spec.namespace.trim() : '',
    ],
    ['app', spec.app],
    ['container', spec.container],
    ['target_service', spec.targetService],
    ['chaos_type', spec.chaosType],
  ];
  for (const [wire, value] of text) {
    if (value !== '') {
      out[wire] = value;
    }
  }
  for (const key of CHAOS_BY_NAME[spec.chaosType]?.params ?? []) {
    const field = PARAM_FIELDS[key];
    const value = spec.params[key];
    if (field.kind === 'number') {
      if (typeof value === 'number') {
        field.wire.forEach((wire) => {
          out[wire] = value;
        });
      }
    } else if (typeof value === 'string' && value !== '') {
      field.wire.forEach((wire) => {
        out[wire] = value;
      });
    }
  }
  return out;
}

export interface SubmitOptions {
  autoAllocate: boolean;
  allowBootstrap: boolean;
  skipRestartPedestal: boolean;
}

export function submitOptionsFor(spec: GuidedInjectionSpec): SubmitOptions {
  return {
    autoAllocate: spec.namespaceMode !== 'specific',
    allowBootstrap: spec.namespaceMode === 'auto-bootstrap',
    skipRestartPedestal: spec.skipRestartPedestal,
  };
}

/** A staged batch lets the server allocate each namespace. */
export const BATCH_SUBMIT_OPTIONS: SubmitOptions = {
  autoAllocate: true,
  allowBootstrap: false,
  skipRestartPedestal: false,
};

export function toSubmitRequest(
  specs: GuidedInjectionSpec[],
  options: SubmitOptions
): InjectionSubmitInjectionReq {
  return {
    benchmark: { name: '' },
    pedestal: { name: '' },
    specs: [specs.map(toGuidedSpec)],
    auto_allocate: options.autoAllocate,
    allow_bootstrap: options.allowBootstrap,
    skip_restart_pedestal: options.skipRestartPedestal,
  };
}

const NAMESPACE_MODES: readonly NamespaceMode[] = [
  'specific',
  'auto',
  'auto-bootstrap',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads a stored spec back, or `null` when it is not one this wizard wrote. */
export function parseSpec(value: unknown): GuidedInjectionSpec | null {
  if (!isRecord(value) || !isRecord(value.params)) {
    return null;
  }
  const mode = NAMESPACE_MODES.find((m) => m === value.namespaceMode);
  const strings = [
    'namespace',
    'systemCode',
    'systemType',
    'app',
    'container',
    'targetService',
    'chaosType',
  ] as const;
  if (
    mode === undefined ||
    strings.some((k) => typeof value[k] !== 'string') ||
    typeof value.durationSec !== 'number' ||
    typeof value.skipRestartPedestal !== 'boolean'
  ) {
    return null;
  }
  const base: GuidedInjectionSpec = {
    namespaceMode: mode,
    namespace: String(value.namespace),
    systemCode: String(value.systemCode),
    systemType: String(value.systemType),
    app: String(value.app),
    container: String(value.container),
    targetService: String(value.targetService),
    chaosType: '',
    durationSec: value.durationSec,
    skipRestartPedestal: value.skipRestartPedestal,
    params: {},
  };
  const stored = value.params;
  const params: Partial<Record<ParamKey, ParamValue>> = {};
  for (const key of Object.keys(PARAM_FIELDS) as ParamKey[]) {
    const v = stored[key];
    if (typeof v === 'string' || typeof v === 'number') {
      params[key] = v;
    }
  }
  const chaosType = String(value.chaosType);
  return CHAOS_BY_NAME[chaosType] === undefined
    ? base
    : withChaosType({ ...base, params }, chaosType);
}
