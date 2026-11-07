import type {
  ContainerSpec,
  InjectionGuidedSpec,
  InjectionSubmitInjectionReq,
  InjectionSubmitInjectionResp,
} from '@lincyaw/portal';

/**
 * The guided-injection wizard, written against the backend's guided submit.
 * `PARAM_FIELDS` is the one description of every fault parameter — its
 * control, its bounds and the request field it is sent as — and follows the
 * param schema each chaos type is checked against at submit, so the form,
 * the preview and the request cannot disagree. Every guided integer is an
 * `int` on the server, and the server pins each fault to its fixed window,
 * so no spec carries a duration.
 */

export type NamespaceMode = 'specific' | 'auto' | 'auto-bootstrap';

export type ParamKey =
  | 'memSize'
  | 'memWorker'
  | 'memType'
  | 'cpuLoad'
  | 'cpuWorker'
  | 'cpuCount'
  | 'latency'
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
  | 'delayDuration'
  | 'domain'
  | 'timeOffset'
  | 'latencyDuration'
  | 'class'
  | 'method'
  | 'database'
  | 'table'
  | 'operation'
  | 'returnType';

export type ParamValue = string | number;

/** A container picked by name; an empty version means its latest. */
export interface ContainerChoice {
  name: string;
  version: string;
}

export interface GuidedInjectionSpec {
  namespaceMode: NamespaceMode;
  namespace: string;
  systemCode: string;
  systemType: string;
  app: string;
  container: string;
  targetService: string;
  chaosType: string;
  pedestal: ContainerChoice;
  benchmark: ContainerChoice;
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
  description?: string;
}

interface NumberFieldBase extends FieldBase {
  kind: 'number';
  wire: NumberWireKey;
  min: number;
  unit?: string;
  defaultValue?: number;
}

export type NumberParamField =
  | (NumberFieldBase & { widget: 'input'; max?: number })
  | (NumberFieldBase & { widget: 'slider'; max: number });

export interface TextParamField extends FieldBase {
  kind: 'text';
  wire: StringWireKey;
  placeholder?: string;
}

export interface ChoiceParamField extends FieldBase {
  kind: 'choice';
  wire: StringWireKey;
  options: readonly string[];
  defaultValue?: string;
}

export type ParamField = NumberParamField | TextParamField | ChoiceParamField;

const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
];

export const PARAM_FIELDS: Record<ParamKey, ParamField> = {
  memSize: {
    kind: 'number',
    widget: 'input',
    label: 'Memory size',
    wire: 'memory_size',
    min: 1,
    max: 65536,
    unit: 'MiB',
    required: true,
  },
  memWorker: {
    kind: 'number',
    widget: 'input',
    label: 'Memory workers',
    wire: 'mem_worker',
    min: 1,
    max: 8,
    required: false,
    description: 'One worker when left empty.',
  },
  memType: {
    kind: 'choice',
    label: 'Memory type',
    wire: 'mem_type',
    options: ['heap', 'stack'],
    defaultValue: 'heap',
    required: false,
  },
  cpuLoad: {
    kind: 'number',
    widget: 'slider',
    label: 'CPU load',
    wire: 'cpu_load',
    min: 1,
    max: 100,
    unit: '%',
    defaultValue: 50,
    required: true,
  },
  cpuWorker: {
    kind: 'number',
    widget: 'input',
    label: 'CPU workers',
    wire: 'cpu_worker',
    min: 1,
    max: 8,
    required: false,
    description: 'One worker when left empty.',
  },
  cpuCount: {
    kind: 'number',
    widget: 'input',
    label: 'CPU count',
    wire: 'cpu_count',
    min: 1,
    max: 16,
    defaultValue: 1,
    required: true,
  },
  latency: {
    kind: 'number',
    widget: 'input',
    label: 'Latency',
    wire: 'latency',
    min: 1,
    max: 60000,
    unit: 'ms',
    required: true,
  },
  jitter: {
    kind: 'number',
    widget: 'input',
    label: 'Jitter',
    wire: 'jitter',
    min: 0,
    unit: 'ms',
    required: false,
  },
  correlation: {
    kind: 'number',
    widget: 'slider',
    label: 'Correlation',
    wire: 'correlation',
    min: 0,
    max: 100,
    unit: '%',
    defaultValue: 0,
    required: false,
  },
  loss: {
    kind: 'number',
    widget: 'input',
    label: 'Packet loss',
    wire: 'loss',
    min: 1,
    max: 100,
    unit: '%',
    required: true,
  },
  duplicate: {
    kind: 'number',
    widget: 'input',
    label: 'Duplicated packets',
    wire: 'duplicate',
    min: 1,
    max: 100,
    unit: '%',
    required: true,
  },
  corrupt: {
    kind: 'number',
    widget: 'input',
    label: 'Corrupted packets',
    wire: 'corrupt',
    min: 1,
    max: 100,
    unit: '%',
    required: true,
  },
  rate: {
    kind: 'number',
    widget: 'input',
    label: 'Rate',
    wire: 'rate',
    min: 1,
    max: 1_000_000,
    unit: 'kbit/s',
    required: true,
  },
  limit: {
    kind: 'number',
    widget: 'input',
    label: 'Queue limit',
    wire: 'limit',
    min: 1,
    unit: 'bytes',
    required: true,
    description: 'Bytes that can wait in the queue for tokens.',
  },
  buffer: {
    kind: 'number',
    widget: 'input',
    label: 'Burst buffer',
    wire: 'buffer',
    min: 1,
    unit: 'bytes',
    required: true,
    description: 'Bytes that can be sent at once.',
  },
  route: {
    kind: 'text',
    label: 'Route',
    wire: 'route',
    placeholder: '/api/checkout',
    required: true,
  },
  httpMethod: {
    kind: 'choice',
    label: 'HTTP method',
    wire: 'http_method',
    options: HTTP_METHODS,
    required: true,
  },
  delayDuration: {
    kind: 'number',
    widget: 'input',
    label: 'Delay',
    wire: 'delay_duration',
    min: 1,
    max: 60000,
    unit: 'ms',
    required: true,
  },
  domain: {
    kind: 'text',
    label: 'Domains',
    wire: 'domain',
    placeholder: 'auth.example.com, *.svc.cluster.local',
    required: true,
    description: 'Host patterns, separated by commas.',
  },
  timeOffset: {
    kind: 'number',
    widget: 'input',
    label: 'Time offset',
    wire: 'time_offset',
    min: -3600,
    max: 3600,
    unit: 's',
    required: true,
    description: 'Negative values move the clock back.',
  },
  latencyDuration: {
    kind: 'number',
    widget: 'input',
    label: 'Latency',
    wire: 'latency_duration',
    min: 1,
    max: 60000,
    unit: 'ms',
    required: true,
  },
  class: {
    kind: 'text',
    label: 'Java class',
    wire: 'class',
    placeholder: 'com.example.UserService',
    required: true,
  },
  method: {
    kind: 'text',
    label: 'Method',
    wire: 'method',
    placeholder: 'login',
    required: true,
  },
  database: {
    kind: 'text',
    label: 'MySQL database',
    wire: 'database',
    required: true,
  },
  table: {
    kind: 'text',
    label: 'MySQL table',
    wire: 'table',
    required: true,
  },
  operation: {
    kind: 'choice',
    label: 'SQL operation',
    wire: 'operation',
    options: ['all', 'select', 'insert', 'update', 'delete', 'replace'],
    required: false,
    description: 'Every statement when left empty.',
  },
  returnType: {
    kind: 'choice',
    label: 'Return type',
    wire: 'return_type',
    options: ['string', 'int'],
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
    description: 'Kill or fail pods and containers.',
  },
  {
    id: 'stress',
    label: 'Stress',
    description: 'CPU or memory pressure inside a container.',
  },
  {
    id: 'http',
    label: 'HTTP',
    description: 'Abort or delay one route at the proxy.',
  },
  {
    id: 'dns',
    label: 'DNS',
    description: 'Fail or scramble lookups of selected hosts.',
  },
  { id: 'time', label: 'Time', description: 'Skew the clock in a container.' },
  {
    id: 'network',
    label: 'Network',
    description: 'Delay, drop, corrupt or cap traffic to a service.',
  },
  {
    id: 'jvm',
    label: 'JVM',
    description: 'Method-level faults in Java apps.',
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
    description: 'Delete the pod; its controller starts a new one.',
    params: [],
    blastHint: 'pod',
  },
  {
    name: 'PodFailure',
    family: 'pod',
    description: 'Make the pod unavailable for the fault window.',
    params: [],
    blastHint: 'pod',
  },
  {
    name: 'ContainerKill',
    family: 'pod',
    description: 'Kill one container in the pod.',
    params: [],
    blastHint: 'pod',
  },
  {
    name: 'MemoryStress',
    family: 'stress',
    description: 'Hold a fixed amount of memory.',
    params: ['memSize', 'memWorker'],
    blastHint: 'pod',
  },
  {
    name: 'CPUStress',
    family: 'stress',
    description: 'Keep the CPU at a load.',
    params: ['cpuLoad', 'cpuWorker'],
    blastHint: 'pod',
  },
  {
    name: 'HTTPRequestAbort',
    family: 'http',
    description: 'Abort matching requests.',
    params: ['route', 'httpMethod'],
    blastHint: 'service',
  },
  {
    name: 'HTTPResponseAbort',
    family: 'http',
    description: 'Abort matching responses.',
    params: ['route', 'httpMethod'],
    blastHint: 'service',
  },
  {
    name: 'HTTPRequestDelay',
    family: 'http',
    description: 'Delay matching requests.',
    params: ['route', 'httpMethod', 'delayDuration'],
    blastHint: 'service',
  },
  {
    name: 'HTTPResponseDelay',
    family: 'http',
    description: 'Delay matching responses.',
    params: ['route', 'httpMethod', 'delayDuration'],
    blastHint: 'service',
  },
  {
    name: 'DNSError',
    family: 'dns',
    description: 'Answer lookups with an error.',
    params: ['domain'],
    blastHint: 'service',
  },
  {
    name: 'DNSRandom',
    family: 'dns',
    description: 'Answer lookups with random addresses.',
    params: ['domain'],
    blastHint: 'service',
  },
  {
    name: 'TimeSkew',
    family: 'time',
    description: 'Shift the clock by a number of seconds.',
    params: ['timeOffset'],
    blastHint: 'pod',
  },
  {
    name: 'NetworkDelay',
    family: 'network',
    description: 'Add latency to traffic.',
    params: ['latency', 'jitter', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkLoss',
    family: 'network',
    description: 'Drop a share of packets.',
    params: ['loss', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkDuplicate',
    family: 'network',
    description: 'Duplicate a share of packets.',
    params: ['duplicate', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkCorrupt',
    family: 'network',
    description: 'Corrupt a share of packets.',
    params: ['corrupt', 'correlation'],
    blastHint: 'service',
  },
  {
    name: 'NetworkBandwidth',
    family: 'network',
    description: 'Cap the bandwidth.',
    params: ['rate', 'limit', 'buffer'],
    blastHint: 'service',
  },
  {
    name: 'NetworkPartition',
    family: 'network',
    description: 'Cut traffic off.',
    params: [],
    blastHint: 'namespace',
  },
  {
    name: 'JVMLatency',
    family: 'jvm',
    description: 'Delay a method before it returns.',
    params: ['class', 'method', 'latencyDuration'],
    blastHint: 'pod',
  },
  {
    name: 'JVMReturn',
    family: 'jvm',
    description: 'Make a method return a fixed value.',
    params: ['class', 'method', 'returnType'],
    blastHint: 'pod',
  },
  {
    name: 'JVMException',
    family: 'jvm',
    description: 'Throw an exception from a method.',
    params: ['class', 'method'],
    blastHint: 'pod',
  },
  {
    name: 'JVMGarbageCollector',
    family: 'jvm',
    description: 'Force garbage collection.',
    params: [],
    blastHint: 'pod',
  },
  {
    name: 'JVMCPUStress',
    family: 'jvm',
    description: 'Load CPUs from inside the JVM.',
    params: ['class', 'method', 'cpuCount'],
    blastHint: 'pod',
  },
  {
    name: 'JVMMemoryStress',
    family: 'jvm',
    description: 'Fill heap or stack memory.',
    params: ['class', 'method', 'memType'],
    blastHint: 'pod',
  },
  {
    name: 'JVMMySQLLatency',
    family: 'jvm',
    description: 'Delay MySQL statements on a table.',
    params: ['database', 'table', 'operation', 'latencyDuration'],
    blastHint: 'pod',
  },
  {
    name: 'JVMMySQLException',
    family: 'jvm',
    description: 'Fail MySQL statements on a table.',
    params: ['database', 'table', 'operation'],
    blastHint: 'pod',
  },
  {
    name: 'JVMRuntimeMutator',
    family: 'jvm',
    description: 'Mutate a method at runtime.',
    params: ['class', 'method'],
    blastHint: 'pod',
  },
];

export const CHAOS_BY_NAME: Partial<Record<string, ChaosTypeDef>> =
  Object.fromEntries(CHAOS_TYPES.map((c) => [c.name, c]));

const NO_CONTAINER: ContainerChoice = { name: '', version: '' };

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
    pedestal: NO_CONTAINER,
    benchmark: NO_CONTAINER,
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

function rangeText(field: NumberParamField): string {
  return field.max === undefined
    ? `At least ${String(field.min)}`
    : `Between ${String(field.min)} and ${String(field.max)}`;
}

/** Why a parameter's value cannot be sent, or `undefined` when it can. */
export function paramProblem(
  field: ParamField,
  value: ParamValue | undefined
): string | undefined {
  if (value === undefined || (typeof value === 'string' && !value.trim())) {
    return field.required ? 'Required' : undefined;
  }
  if (field.kind === 'number') {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return 'Enter a whole number';
    }
    const above = field.max !== undefined && value > field.max;
    return value < field.min || above ? rangeText(field) : undefined;
  }
  if (field.kind === 'choice' && !field.options.includes(String(value))) {
    return `One of ${field.options.join(', ')}`;
  }
  return undefined;
}

/**
 * The pedestal a system runs on: its short code without the instance
 * number, as the server reads it (`ts0` → `ts`).
 */
export function pedestalFor(systemCode: string): string {
  const stripped = systemCode.replace(/\d+$/, '');
  return stripped === '' ? systemCode : stripped;
}

/** Why the chosen pedestal cannot run the spec's system, or `undefined`. */
export function pedestalProblem(spec: GuidedInjectionSpec): string | undefined {
  if (spec.pedestal.name === '') {
    return 'Required';
  }
  const expected = pedestalFor(spec.systemCode);
  return spec.systemCode === '' || spec.pedestal.name === expected
    ? undefined
    : `System ${spec.systemCode} runs on the ${expected} pedestal`;
}

export const WIZARD_STEPS = [
  'Target',
  'Chaos type',
  'Parameters',
  'Pedestal',
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
      return pedestalProblem(spec) === undefined && spec.benchmark.name !== '';
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
  const out: InjectionGuidedSpec = {};
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
        out[field.wire] = value;
      }
    } else if (typeof value === 'string' && value.trim() !== '') {
      out[field.wire] = value.trim();
    }
  }
  return out;
}

/** What one request carries for every spec in it. */
export interface RequestOptions {
  pedestal: ContainerChoice;
  benchmark: ContainerChoice;
  namespaceMode: NamespaceMode;
  skipRestartPedestal: boolean;
}

export function requestOptionsFor(spec: GuidedInjectionSpec): RequestOptions {
  return {
    pedestal: spec.pedestal,
    benchmark: spec.benchmark,
    // A specific namespace travels in each spec; only the mode is shared.
    namespaceMode: spec.namespaceMode,
    skipRestartPedestal: spec.skipRestartPedestal,
  };
}

function containerText({ name, version }: ContainerChoice): string {
  return `${name} ${version === '' ? 'latest' : version}`;
}

const NAMESPACE_TEXT: Record<NamespaceMode, string> = {
  specific: 'a specific namespace',
  auto: 'auto-allocated namespaces',
  'auto-bootstrap': 'auto-allocated namespaces with bootstrap',
};

/**
 * Why `spec` cannot join a batch sent with `options`, or `undefined` when
 * it can: one request has one pedestal, one benchmark and one namespace
 * policy for all its specs.
 */
export function batchConflict(
  options: RequestOptions,
  spec: GuidedInjectionSpec
): string | undefined {
  const own = requestOptionsFor(spec);
  const differences: string[] = [];
  if (containerText(own.pedestal) !== containerText(options.pedestal)) {
    differences.push(`pedestal ${containerText(options.pedestal)}`);
  }
  if (containerText(own.benchmark) !== containerText(options.benchmark)) {
    differences.push(`benchmark ${containerText(options.benchmark)}`);
  }
  if (own.namespaceMode !== options.namespaceMode) {
    differences.push(NAMESPACE_TEXT[options.namespaceMode]);
  }
  if (own.skipRestartPedestal !== options.skipRestartPedestal) {
    differences.push(
      options.skipRestartPedestal ? 'no pedestal restart' : 'a pedestal restart'
    );
  }
  return differences.length === 0
    ? undefined
    : `The batch uses ${differences.join(', ')}. Match it to stage this draft, or submit it on its own.`;
}

function toContainerSpec({ name, version }: ContainerChoice): ContainerSpec {
  return version === '' ? { name } : { name, version };
}

/** One request; each spec is its own batch, so each becomes one injection. */
export function toSubmitRequest(
  specs: GuidedInjectionSpec[],
  options: RequestOptions
): InjectionSubmitInjectionReq {
  return {
    pedestal: toContainerSpec(options.pedestal),
    benchmark: toContainerSpec(options.benchmark),
    specs: specs.map((s) => [toGuidedSpec(s)]),
    auto_allocate: options.namespaceMode !== 'specific',
    allow_bootstrap: options.namespaceMode === 'auto-bootstrap',
    skip_restart_pedestal: options.skipRestartPedestal,
  };
}

function injections(count: number): string {
  return `${String(count)} injection${count === 1 ? '' : 's'}`;
}

/**
 * What the server made of a submit of `sent` specs: it creates one
 * injection per spec, but skips specs that repeat one in the same request
 * or one already injected.
 */
export function submitOutcome(
  resp: InjectionSubmitInjectionResp,
  sent: number
): { created: number; text: string } {
  const created = resp.items?.length ?? 0;
  const existing = resp.warnings?.batches_exist_in_database?.length ?? 0;
  const repeated = resp.warnings?.duplicate_batches_in_request?.length ?? 0;
  const parts = [`${injections(created)} queued`];
  if (existing > 0) {
    parts.push(`${String(existing)} skipped as already injected`);
  }
  if (repeated > 0) {
    parts.push(`${String(repeated)} skipped as repeated in the request`);
  }
  const unexplained = sent - created - existing - repeated;
  if (unexplained > 0) {
    parts.push(`${String(unexplained)} not created`);
  }
  return { created, text: parts.join(', ') };
}

const NAMESPACE_MODES: readonly NamespaceMode[] = [
  'specific',
  'auto',
  'auto-bootstrap',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseContainer(value: unknown): ContainerChoice {
  return isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.version === 'string'
    ? { name: value.name, version: value.version }
    : NO_CONTAINER;
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
    pedestal: parseContainer(value.pedestal),
    benchmark: parseContainer(value.benchmark),
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
