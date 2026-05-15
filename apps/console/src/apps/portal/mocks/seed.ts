import type {
  MockClusterCheck,
  MockClusterEvent,
  MockContainer,
  MockContract,
  MockDataset,
  MockEvalCase,
  MockEvalRun,
  MockInjection,
  MockInjectionTemplate,
  MockLabel,
  MockPedestal,
  MockProject,
  MockRegressionCase,
  MockRegressionRun,
  MockStagedInjection,
  MockStoreState,
  MockSystem,
  MockTask,
  MockTrace,
} from './types';

const now = Date.now();
const iso = (offsetMin: number): string =>
  new Date(now - offsetMin * 60 * 1000).toISOString();

const projects: MockProject[] = [
  {
    id: 'proj-catalog',
    name: 'catalog-service',
    description: 'Catalog ms ownership — main inject campaign.',
    status: 'active',
    injectionCount: 18,
    createdAt: iso(60 * 24 * 30),
  },
  {
    id: 'proj-payment',
    name: 'payment-gateway',
    description: 'Payment fault drills.',
    status: 'active',
    injectionCount: 9,
    createdAt: iso(60 * 24 * 12),
  },
  {
    id: 'proj-auth',
    name: 'auth-service',
    description: 'Archived — Q4 2025 work.',
    status: 'archived',
    injectionCount: 24,
    createdAt: iso(60 * 24 * 90),
  },
];

const systems: MockSystem[] = [
  {
    code: 'otel-demo',
    name: 'OpenTelemetry Demo',
    description: 'OTel reference benchmark.',
    chart: 'oci://opspai/benchmarks/otel-demo',
    version: 'v1.10.0',
    otelEndpoint: 'http://otel-collector:4317',
    enabled: true,
    pedestalCount: 2,
    lastInjectionAt: iso(45),
    prereqs: [
      { name: 'helm chart published', ok: true },
      { name: 'otel collector reachable', ok: true },
      { name: 'db seed applied', ok: true },
    ],
    systemType: 'otel-demo',
    apps: [
      'cartservice',
      'checkoutservice',
      'productcatalogservice',
      'currencyservice',
      'paymentservice',
      'recommendationservice',
      'shippingservice',
      'emailservice',
    ],
  },
  {
    code: 'ts',
    name: 'Train-Ticket (OperationsPAI fork)',
    description: 'Java microservice — 41 services.',
    chart: 'oci://opspai/benchmarks/ts',
    version: 'v1.4.2',
    otelEndpoint: 'http://otel-collector:4317',
    enabled: true,
    pedestalCount: 2,
    lastInjectionAt: iso(12),
    prereqs: [
      { name: 'helm chart published', ok: true },
      { name: 'otel collector reachable', ok: true },
      { name: 'db seed applied', ok: true },
      { name: 'sidecar image mirrored', ok: false, note: 'volces only' },
    ],
    systemType: 'train-ticket',
    apps: [
      'ts-ui-dashboard',
      'ts-auth-service',
      'ts-order-service',
      'ts-travel-service',
      'ts-station-service',
      'ts-payment-service',
      'ts-user-service',
      'ts-route-service',
    ],
  },
  {
    code: 'hs',
    name: 'Hotel Reservation (DSB Go)',
    description: 'DeathStarBench — Go stack.',
    chart: 'oci://opspai/benchmarks/hs',
    version: 'v0.9.1',
    otelEndpoint: 'http://otel-collector:4317',
    enabled: true,
    pedestalCount: 1,
    lastInjectionAt: iso(180),
    prereqs: [
      { name: 'helm chart published', ok: true },
      { name: 'jaeger-otlp bridge', ok: true },
    ],
    systemType: 'hotel-reservation',
    apps: [
      'frontend',
      'profile',
      'reservation',
      'search',
      'rate',
      'user',
      'geo',
      'recommendation',
    ],
  },
  {
    code: 'sn',
    name: 'Social Network (DSB C++)',
    description: 'DeathStarBench — C++ stack.',
    chart: 'oci://opspai/benchmarks/sn',
    version: 'v0.9.1',
    otelEndpoint: 'http://otel-collector:4317',
    enabled: true,
    pedestalCount: 1,
    lastInjectionAt: iso(300),
    prereqs: [
      { name: 'jaeger-otlp bridge', ok: true },
      { name: 'dsb-wrk2 loadgen', ok: true },
    ],
    systemType: 'social-network',
    apps: [
      'user-service',
      'post-service',
      'media-service',
      'home-timeline-service',
      'user-timeline-service',
      'compose-post-service',
      'url-shorten-service',
    ],
  },
  {
    code: 'mm',
    name: 'Media Microservices (DSB C++)',
    description: 'DeathStarBench — media flow.',
    chart: 'oci://opspai/benchmarks/mm',
    version: 'v0.9.1',
    otelEndpoint: 'http://otel-collector:4317',
    enabled: false,
    pedestalCount: 0,
    lastInjectionAt: iso(60 * 24 * 5),
    prereqs: [{ name: 'helm chart published', ok: true }],
    systemType: 'media-microservices',
    apps: ['compose-review', 'read-page', 'unique-id', 'cast-info', 'movie-info', 'plot'],
  },
  {
    code: 'sockshop',
    name: 'Sock Shop',
    description: 'Weaveworks polyglot demo.',
    chart: 'oci://opspai/benchmarks/sockshop',
    version: 'v0.18.0',
    otelEndpoint: 'http://otel-collector:4317',
    enabled: true,
    pedestalCount: 2,
    lastInjectionAt: iso(420),
    prereqs: [
      { name: 'helm chart published', ok: true },
      { name: 'otel collector reachable', ok: true },
    ],
    systemType: 'sock-shop',
    apps: [
      'orders',
      'carts',
      'payment',
      'catalogue',
      'shipping',
      'user',
      'front-end',
      'queue-master',
    ],
  },
  {
    code: 'tea',
    name: 'TeaStore (Descartes Java)',
    description: 'Descartes Labs Java benchmark.',
    chart: 'oci://opspai/benchmarks/teastore',
    version: 'v1.5.0',
    otelEndpoint: 'http://otel-collector:4317',
    enabled: true,
    pedestalCount: 1,
    lastInjectionAt: iso(60 * 24 * 2),
    prereqs: [
      { name: 'jaeger-client-java + bridge', ok: true },
      { name: 'env-inject sidecar', ok: true },
    ],
    systemType: 'teastore',
    apps: ['webui', 'auth', 'persistence', 'recommender', 'image', 'registry'],
  },
  {
    code: 'mediamicroservices',
    name: 'MediaMicroservices',
    description: 'DSB media stack.',
    chart: 'oci://opspai/benchmarks/mediamicroservices',
    version: 'v0.9.1',
    otelEndpoint: 'http://otel-collector:4317',
    enabled: true,
    pedestalCount: 1,
    lastInjectionAt: iso(60 * 24 * 1),
    prereqs: [{ name: 'jaeger-otlp bridge', ok: true }],
    systemType: 'media-microservices',
    apps: ['compose-review', 'movie-info', 'cast-info', 'plot', 'rating'],
  },
];

const pedestals: MockPedestal[] = [
  {
    id: 'ped-001',
    systemCode: 'ts',
    namespace: 'ts-1',
    version: 'v1.4.2',
    status: 'running',
    age: '3d',
    lastRestartAt: iso(60 * 24 * 3),
    helmValues:
      'image:\n  repository: pair-cn-shanghai.cr.volces.com/opspai/ts\n  tag: v1.4.2\notel:\n  endpoint: http://otel-collector:4317\n',
  },
  {
    id: 'ped-002',
    systemCode: 'ts',
    namespace: 'ts-2',
    version: 'v1.4.2',
    status: 'running',
    age: '3d',
    lastRestartAt: iso(60 * 24 * 3),
    helmValues:
      'image:\n  repository: pair-cn-shanghai.cr.volces.com/opspai/ts\n  tag: v1.4.2\n',
  },
  {
    id: 'ped-003',
    systemCode: 'hs',
    namespace: 'hs-1',
    version: 'v0.9.1',
    status: 'running',
    age: '5h',
    lastRestartAt: iso(60 * 5),
    helmValues: 'image:\n  repository: opspai/hs\n  tag: v0.9.1\n',
  },
  {
    id: 'ped-004',
    systemCode: 'otel-demo',
    namespace: 'otel-demo-1',
    version: 'v1.10.0',
    status: 'pending',
    age: '2m',
    lastRestartAt: iso(2),
    helmValues: 'image:\n  repository: opspai/otel-demo\n  tag: v1.10.0\n',
  },
  {
    id: 'ped-005',
    systemCode: 'otel-demo',
    namespace: 'otel-demo-2',
    version: 'v1.10.0',
    status: 'running',
    age: '1d',
    lastRestartAt: iso(60 * 24),
    helmValues: 'image:\n  repository: opspai/otel-demo\n  tag: v1.10.0\n',
  },
  {
    id: 'ped-006',
    systemCode: 'sn',
    namespace: 'sn-1',
    version: 'v0.9.1',
    status: 'running',
    age: '2d',
    lastRestartAt: iso(60 * 24 * 2),
    helmValues: 'image:\n  repository: opspai/sn\n  tag: v0.9.1\n',
  },
  {
    id: 'ped-007',
    systemCode: 'sockshop',
    namespace: 'sockshop-1',
    version: 'v0.18.0',
    status: 'running',
    age: '7d',
    lastRestartAt: iso(60 * 24 * 7),
    helmValues: 'image:\n  repository: opspai/sockshop\n  tag: v0.18.0\n',
  },
  {
    id: 'ped-008',
    systemCode: 'sockshop',
    namespace: 'sockshop-2',
    version: 'v0.18.0',
    status: 'running',
    age: '7d',
    lastRestartAt: iso(60 * 24 * 7),
    helmValues: 'image:\n  repository: opspai/sockshop\n  tag: v0.18.0\n',
  },
  {
    id: 'ped-009',
    systemCode: 'tea',
    namespace: 'tea-1',
    version: 'v1.5.0',
    status: 'running',
    age: '4d',
    lastRestartAt: iso(60 * 24 * 4),
    helmValues: 'image:\n  repository: opspai/teastore\n  tag: v1.5.0\n',
  },
  {
    id: 'ped-010',
    systemCode: 'mediamicroservices',
    namespace: 'mm-1',
    version: 'v0.9.1',
    status: 'running',
    age: '1d',
    lastRestartAt: iso(60 * 24),
    helmValues: 'image:\n  repository: opspai/mm\n  tag: v0.9.1\n',
  },
];

const buildContract = (
  id: string,
  name: string,
  faultType: MockContract['faultType'],
  family: string,
  targetKind: string,
  paramCount: number,
  description: string,
): MockContract => ({
  id,
  name,
  faultType,
  family,
  targetKind,
  paramCount,
  lastUsedAt: iso(Math.floor(Math.random() * 60 * 24 * 3)),
  spec: JSON.stringify(
    {
      fault_type: faultType,
      action: name,
      params: { duration: '60s' },
      selector: { namespaces: ['<SYSTEM_NS>'], labels: { app: '<TARGET>' } },
    },
    null,
    2,
  ),
  description,
});

const contracts: MockContract[] = [
  buildContract('ctr-pod-kill', 'pod-kill', 'pod', 'pod', 'Pod', 2, 'Hard pod kill.'),
  buildContract(
    'ctr-pod-failure',
    'pod-failure',
    'pod',
    'pod',
    'Pod',
    3,
    'Mark pod unready for N seconds.',
  ),
  buildContract(
    'ctr-container-kill',
    'container-kill',
    'pod',
    'pod',
    'Container',
    2,
    'Kill a specific container in a pod.',
  ),
  buildContract(
    'ctr-net-delay',
    'network-delay',
    'network',
    'network',
    'Service',
    5,
    'Inject latency on egress.',
  ),
  buildContract(
    'ctr-net-loss',
    'network-loss',
    'network',
    'network',
    'Service',
    4,
    'Drop packets at egress.',
  ),
  buildContract(
    'ctr-net-corrupt',
    'network-corrupt',
    'network',
    'network',
    'Service',
    4,
    'Corrupt packets.',
  ),
  buildContract(
    'ctr-net-partition',
    'network-partition',
    'network',
    'network',
    'Service',
    3,
    'Sever traffic between two services.',
  ),
  buildContract(
    'ctr-dns',
    'dns-error',
    'dns',
    'network',
    'Service',
    2,
    'Return NXDOMAIN for selected hosts.',
  ),
  buildContract(
    'ctr-http-abort',
    'http-abort',
    'http',
    'http',
    'Ingress',
    4,
    'Abort HTTP requests at proxy.',
  ),
  buildContract(
    'ctr-http-500',
    'http-500',
    'http',
    'http',
    'Ingress',
    3,
    'Return synthetic 500.',
  ),
  buildContract(
    'ctr-http-delay',
    'http-delay',
    'http',
    'http',
    'Ingress',
    3,
    'Delay HTTP responses.',
  ),
  buildContract(
    'ctr-jvm-cpu',
    'jvm-cpu-burn',
    'jvm',
    'jvm',
    'Pod',
    2,
    'Burn CPU inside JVM via attach.',
  ),
  buildContract(
    'ctr-jvm-mem',
    'jvm-mem-pressure',
    'jvm',
    'jvm',
    'Pod',
    2,
    'Allocate to fill heap.',
  ),
  buildContract(
    'ctr-jvm-throw',
    'jvm-throw',
    'jvm',
    'jvm',
    'Pod',
    3,
    'Throw exception from method.',
  ),
  buildContract(
    'ctr-stress-cpu',
    'stress-cpu',
    'stress',
    'stress',
    'Pod',
    2,
    'CPU stress with stress-ng.',
  ),
  buildContract(
    'ctr-stress-mem',
    'stress-memory',
    'stress',
    'stress',
    'Pod',
    2,
    'Memory stress.',
  ),
  buildContract(
    'ctr-stress-io',
    'stress-io',
    'stress',
    'stress',
    'Pod',
    3,
    'Disk IO stress.',
  ),
  buildContract(
    'ctr-time-shift',
    'time-shift',
    'time',
    'time',
    'Pod',
    2,
    'Skew clock inside container.',
  ),
  buildContract(
    'ctr-jvm-gc',
    'jvm-gc-pressure',
    'jvm',
    'jvm',
    'Pod',
    2,
    'Trigger frequent GC.',
  ),
  buildContract(
    'ctr-dns-delay',
    'dns-delay',
    'dns',
    'network',
    'Service',
    2,
    'Slow DNS responses.',
  ),
];

const STATUS_CYCLE: Array<MockInjection['status']> = [
  'completed',
  'completed',
  'completed',
  'running',
  'failed',
  'cancelled',
  'pending',
];

const SYS_TARGETS: Record<string, string[]> = {
  'otel-demo': ['cartservice', 'checkoutservice', 'productcatalogservice'],
  ts: ['ts-travel-service', 'ts-order-service', 'ts-station-service', 'ts-payment-service'],
  hs: ['frontend', 'profile', 'reservation', 'search'],
  sn: ['user-service', 'post-service', 'media-service'],
  mm: ['compose-review', 'read-page', 'unique-id'],
  sockshop: ['orders', 'carts', 'payment', 'catalogue'],
  tea: ['webui', 'auth', 'persistence', 'recommender'],
  mediamicroservices: ['compose-review', 'movie-info'],
};

const injections: MockInjection[] = [];
const tasks: MockTask[] = [];
const traces: MockTrace[] = [];

let injCounter = 9900;
let taskCounter = 9000;
let traceCounter = 7700;

for (let i = 0; i < 50; i++) {
  const status = STATUS_CYCLE[i % STATUS_CYCLE.length] ?? 'pending';
  const projectId = projects[i % projects.length]?.id ?? 'proj-catalog';
  const sys = systems[i % systems.length] ?? systems[0];
  if (!sys) {
    continue;
  }
  const contract = contracts[i % contracts.length];
  if (!contract) {
    continue;
  }
  const targets = SYS_TARGETS[sys.code] ?? ['default-target'];
  const target = targets[i % targets.length] ?? 'default-target';
  const id = `inj-${injCounter++}`;
  const taskId = `task-${taskCounter++}`;
  const traceId =
    status === 'pending' || status === 'cancelled' ? null : `trace-${traceCounter++}`;
  const createdAt = iso(i * 47);

  injections.push({
    id,
    projectId,
    systemCode: sys.code,
    contractId: contract.id,
    taskId,
    traceId,
    blastRadius: i % 3 === 0 ? 'service' : i % 3 === 1 ? 'pod' : 'namespace',
    durationSec: 60 + (i % 4) * 30,
    intensity: 50 + (i % 5) * 10,
    status,
    createdAt,
    name: `${contract.name}-${target}`,
  });
  tasks.push({
    id: taskId,
    kind: 'injection',
    parentId: id,
    parentLabel: id,
    status,
    startedAt: createdAt,
    durationMs: 60000 + (i % 5) * 12000,
    logs: [
      { ts: '00:00:00', level: 'info', body: `task spawned for ${id}` },
      { ts: '00:00:01', level: 'info', body: `inject contract=${contract.name} target=${target}` },
      { ts: '00:00:02', level: 'info', body: 'chaos resource applied' },
    ],
  });
  if (traceId) {
    traces.push({
      id: traceId,
      projectId,
      injectionId: id,
      rootOperation: `GET /${target}`,
      durationMs: 800 + (i % 7) * 320,
      spanCount: 12 + (i % 8) * 4,
      startedAt: createdAt,
    });
  }
}

const datasets: MockDataset[] = [
  {
    id: 'ds-ts-2026-04-25',
    name: 'ts-2026-04-25-n500',
    description: 'Train-Ticket clean replay baseline, n=500.',
    injectionIds: injections.filter((i) => i.systemCode === 'ts').map((i) => i.id),
    fileCount: 12,
    sizeMb: 480,
    createdAt: iso(60 * 24 * 4),
  },
  {
    id: 'ds-hs-2026-04-30',
    name: 'hs-2026-04-30-n200',
    description: 'Hotel-Reservation focused replay.',
    injectionIds: injections.filter((i) => i.systemCode === 'hs').map((i) => i.id),
    fileCount: 8,
    sizeMb: 220,
    createdAt: iso(60 * 24 * 3),
  },
  {
    id: 'ds-mixed-replay',
    name: 'mixed-replay-n100',
    description: 'Cross-stack sampler.',
    injectionIds: injections.slice(0, 12).map((i) => i.id),
    fileCount: 4,
    sizeMb: 96,
    createdAt: iso(60 * 24 * 1),
  },
  {
    id: 'ds-otel-cart',
    name: 'otel-cart-baseline',
    description: 'otel-demo cart-service campaign.',
    injectionIds: injections.filter((i) => i.systemCode === 'otel-demo').map((i) => i.id),
    fileCount: 6,
    sizeMb: 140,
    createdAt: iso(60 * 24 * 7),
  },
];

const labels: MockLabel[] = [
  { id: 'lab-prod', name: 'production', color: 'ink', count: 18 },
  { id: 'lab-flaky', name: 'flaky', color: 'warning', count: 4 },
  { id: 'lab-baseline', name: 'baseline', color: 'ghost', count: 22 },
  { id: 'lab-rl-eval', name: 'rl-eval', color: 'ghost', count: 12 },
];

const containers: MockContainer[] = [
  {
    id: 'cnt-rcabench',
    name: 'rcabench-algo',
    image: 'opspai/rcabench-algo:r1',
    algorithm: 'random-forest',
    createdAt: iso(60 * 24 * 14),
  },
  {
    id: 'cnt-microrca',
    name: 'micro-rca',
    image: 'opspai/microrca:0.4.1',
    algorithm: 'microRCA',
    createdAt: iso(60 * 24 * 30),
  },
];

const regressionCases: MockRegressionCase[] = [
  {
    id: 'reg-ts-baseline',
    name: 'ts-baseline',
    description: 'Train-Ticket happy-path inject→collect smoke.',
    owner: 'lincyaw',
    passRate: 0.986,
    lastStatus: 'pass',
    lastRunAt: iso(60 * 3),
  },
  {
    id: 'reg-otel-cart',
    name: 'otel-cart-failure',
    description: 'otel-demo cart-service podfailure end-to-end.',
    owner: 'boxiyu',
    passRate: 1.0,
    lastStatus: 'pass',
    lastRunAt: iso(60 * 4),
  },
  {
    id: 'reg-hs-net',
    name: 'hs-network-jitter',
    description: 'Hotel-Reservation network jitter survival.',
    owner: 'lincyaw',
    passRate: 0.824,
    lastStatus: 'fail',
    lastRunAt: iso(60 * 12),
  },
  {
    id: 'reg-sn-cpu',
    name: 'sn-cpu-burn',
    description: 'Social-Network CPU stress survival.',
    owner: 'boxiyu',
    passRate: 0.91,
    lastStatus: 'running',
    lastRunAt: iso(60),
  },
  {
    id: 'reg-sockshop',
    name: 'sockshop-orders-loss',
    description: 'Sock-Shop orders-service network-loss.',
    owner: 'lincyaw',
    passRate: 0.95,
    lastStatus: 'pass',
    lastRunAt: iso(60 * 22),
  },
];

const regressionRuns: MockRegressionRun[] = [];
let runCounter = 500;
for (const c of regressionCases) {
  for (let i = 0; i < 3; i++) {
    const id = `regrun-${runCounter++}`;
    const childTaskIds: string[] = [];
    for (let j = 0; j < 4; j++) {
      const tid = `task-${taskCounter++}`;
      childTaskIds.push(tid);
      tasks.push({
        id: tid,
        kind: 'regression',
        parentId: id,
        parentLabel: c.name,
        status: i === 0 ? 'running' : j === 0 && c.lastStatus === 'fail' ? 'failed' : 'completed',
        startedAt: iso(60 * 24 * (i + 1)),
        durationMs: 90000 + j * 5000,
        logs: [{ ts: '00:00:00', level: 'info', body: `regression child ${j}` }],
      });
    }
    const fails = c.lastStatus === 'fail' && i === 2 ? 1 : 0;
    regressionRuns.push({
      id,
      caseId: c.id,
      systemCode: 'ts',
      datasetId: 'ds-ts-2026-04-25',
      status: i === 0 ? 'running' : 'completed',
      startedAt: iso(60 * 24 * (i + 1)),
      durationMs: 380000 + i * 10000,
      childTaskIds,
      passes: 4 - fails,
      fails,
    });
  }
}

const evalRuns: MockEvalRun[] = [];
const evalCases: MockEvalCase[] = [];
const MODELS = ['claude-opus-4-7', 'gpt-5-4', 'claude-sonnet-4-6', 'claude-opus-4-7'];
let evalCounter = 1;
let caseCounter = 1;

for (let r = 0; r < 4; r++) {
  const id = `eval-2026-05-${String(15 - r).padStart(2, '0')}-${String(evalCounter++).padStart(2, '0')}`;
  const caseIds: string[] = [];
  const nCases = 8;
  for (let i = 0; i < nCases; i++) {
    const cid = `evcase-${caseCounter++}`;
    caseIds.push(cid);
    const passed = i % 3 !== 0;
    const inj = injections[(r * 4 + i) % injections.length];
    if (!inj) {
      continue;
    }
    const altPatterns = ['symptom_propagation', 'process_tax_signal', 'co_anomaly_inference'];
    evalCases.push({
      id: cid,
      runId: id,
      injectionId: inj.id,
      traceId: inj.traceId ?? 'trace-7700',
      pattern: passed
        ? 'path_reachability'
        : altPatterns[i % altPatterns.length] ?? 'symptom_propagation',
      tier: i % 2 === 0 ? 'tier-1' : 'tier-2',
      passed,
      score: passed ? 0.72 + Math.random() * 0.18 : 0.2 + Math.random() * 0.2,
      trajectory: [
        {
          step: 1,
          timestamp: '00:00:01',
          actionType: 'tool_call',
          action: 'query_metrics(service="catalog")',
          thought: 'Check **latency p99** first.',
          observation: 'p99 = 2.84s vs baseline 120ms',
        },
        {
          step: 2,
          timestamp: '00:00:03',
          actionType: 'tool_call',
          action: 'get_traces(min_duration_ms=1000)',
          thought: 'Drill into slow traces.',
          observation: 'Root span GET /products dominated by SELECT inventory.',
        },
        {
          step: 3,
          timestamp: '00:00:05',
          actionType: 'message',
          action: 'Conclude root cause',
          observation: passed
            ? '**Root cause**: missing index on inventory.sku.'
            : '**Inconclusive** — multiple candidates.',
        },
      ],
    });
  }
  evalRuns.push({
    id,
    model: MODELS[r % MODELS.length] ?? 'claude-opus-4-7',
    datasetId: datasets[r % datasets.length]?.id ?? 'ds-mixed-replay',
    nCases,
    status: r === 0 ? 'running' : 'completed',
    tier1Score: 0.7 + r * 0.03,
    tier2Score: 0.55 + r * 0.04,
    pathReachability: 0.71 + r * 0.02,
    completionRate: 0.96 - r * 0.01,
    startedAt: iso(60 * 24 * r + 60 * 6),
    caseIds,
  });
}

const clusterChecks: MockClusterCheck[] = [
  { id: 'chk-k8s', name: 'K8s API', status: 'ok', detail: 'reachable (latency 12ms)' },
  { id: 'chk-redis', name: 'Redis', status: 'ok', detail: 'ping ok' },
  { id: 'chk-mysql', name: 'MySQL', status: 'ok', detail: 'pool healthy' },
  { id: 'chk-etcd', name: 'etcd', status: 'ok', detail: 'quorum 3/3' },
  { id: 'chk-ch', name: 'ClickHouse', status: 'ok', detail: 'insert ok' },
  {
    id: 'chk-otel',
    name: 'OTel collector',
    status: 'warn',
    detail: 'queue depth 1280 (warn @ 1000)',
    action: { label: 'View logs', kind: 'view-logs' },
  },
  {
    id: 'chk-pedestals',
    name: 'Pedestal health',
    status: 'warn',
    detail: '1 pedestal pending > 2m',
    action: { label: 'Restart pedestal', kind: 'restart-pedestal' },
  },
];

const clusterEvents: MockClusterEvent[] = [
  { ts: '10:01:02', level: 'info', body: 'preflight check started' },
  { ts: '10:01:03', level: 'info', body: 'kube-api reachable (12ms)' },
  { ts: '10:01:04', level: 'info', body: 'redis ping ok' },
  { ts: '10:01:05', level: 'info', body: 'mysql pool healthy' },
  { ts: '10:01:06', level: 'info', body: 'etcd quorum 3/3' },
  { ts: '10:01:07', level: 'info', body: 'clickhouse insert ok' },
  { ts: '10:01:08', level: 'warn', body: 'otel-collector queue depth 1280' },
];

const baseSpec = {
  namespaceMode: 'auto' as const,
  namespace: '',
  install: false,
  readyTimeoutSec: 180,
  durationSec: 60,
  skipRestartPedestal: false,
  skipStaleCheck: false,
};

const injectionTemplates: MockInjectionTemplate[] = [
  {
    id: 'tpl-ts-pod-kill',
    name: 'Kill ts-order-service pod',
    description: 'Hard pod kill on Train-Ticket order service.',
    spec: {
      ...baseSpec,
      systemCode: 'ts',
      systemType: 'train-ticket',
      app: 'ts-order-service',
      container: '',
      targetService: '',
      chaosType: 'PodKill',
    },
  },
  {
    id: 'tpl-otel-checkout-delay',
    name: '500ms latency on /api/checkout',
    description: 'HTTP response delay on otel-demo checkout route.',
    spec: {
      ...baseSpec,
      systemCode: 'otel-demo',
      systemType: 'otel-demo',
      app: 'checkoutservice',
      container: '',
      targetService: 'checkoutservice',
      chaosType: 'HTTPResponseDelay',
      route: '/api/checkout',
      httpMethod: 'POST',
      latencyMs: 500,
      latencyDuration: 60,
    },
  },
  {
    id: 'tpl-ts-user-exception',
    name: 'JVM exception on UserService.login',
    description: 'Throw runtime exception inside login method.',
    spec: {
      ...baseSpec,
      systemCode: 'ts',
      systemType: 'train-ticket',
      app: 'ts-user-service',
      container: '',
      targetService: '',
      chaosType: 'JVMException',
      class: 'com.cloudhubs.trainticket.user.service.UserServiceImpl',
      method: 'login',
      exceptionOpt: 'java.lang.RuntimeException("aegis-injected")',
    },
  },
  {
    id: 'tpl-hs-net-delay',
    name: 'Network jitter on hs frontend',
    description: '200ms ± 50ms egress jitter on Hotel-Reservation frontend.',
    spec: {
      ...baseSpec,
      systemCode: 'hs',
      systemType: 'hotel-reservation',
      app: 'frontend',
      container: '',
      targetService: '',
      chaosType: 'NetworkDelay',
      direction: 'both',
      latencyMs: 200,
      jitter: 50,
      correlation: 25,
    },
  },
  {
    id: 'tpl-sn-cpu',
    name: 'CPU burn on sn user-service',
    description: 'stress-ng 80% CPU on 2 workers.',
    spec: {
      ...baseSpec,
      systemCode: 'sn',
      systemType: 'social-network',
      app: 'user-service',
      container: '',
      targetService: '',
      chaosType: 'CPUStress',
      cpuLoad: 80,
      cpuWorker: 2,
    },
  },
];

const stagedInjections: MockStagedInjection[] = [];

export const seedState: MockStoreState = {
  projects,
  systems,
  pedestals,
  contracts,
  injections,
  tasks,
  traces,
  datasets,
  labels,
  containers,
  regressionCases,
  regressionRuns,
  evalRuns,
  evalCases,
  clusterChecks,
  clusterEvents,
  injectionTemplates,
  stagedInjections,
  activeProjectId: projects[0]?.id ?? '',
};
