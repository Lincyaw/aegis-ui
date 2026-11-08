/**
 * The review app's own text, in English and Chinese. Task content (claims,
 * facts, verdict options, the guide) comes from the API in its own language;
 * these are the words around it.
 */

export type ReviewLocale = 'en' | 'zh-CN';

type Change = 'none' | 'vanished' | 'new' | 'errors' | 'slower' | 'steady';
type InferredBasis = 'caller-spans' | 'callee-spans';

const plural = (n: number, one: string, many: string): string =>
  `${String(n)} ${n === 1 ? one : many}`;

export const reviewEn = {
  /* Shell */
  languageSwitch: 'Language',

  /* Changes between the windows */
  changeLabel: {
    none: 'no calls in either window',
    vanished: 'calls only in the normal window',
    new: 'calls only in the abnormal window',
    errors: 'error rate up',
    slower: 'slower',
    steady: 'no change past the thresholds',
  } satisfies Record<Change, string>,
  changeErr: (pp: string) => `err ${pp}`,
  changeGone: 'gone',
  changeNew: 'new',
  thresholdNote: (pp: number, ratio: number) =>
    `Abnormal vs normal window · red: error rate up ≥ ${String(pp)} pp · amber: p50 or p95 ≥ ${String(ratio)}× · width: calls`,

  /* Figures on chips and wires */
  noCallsEither: 'no calls in either window',
  callsChange: (n: string, a: string) => `calls ${n} → ${a}`,
  errorsChange: (n: string, a: string) => `errors ${n} → ${a}`,
  noSpansServed: 'no spans served',
  spansChange: (n: string, a: string) => `${n} → ${a} spans`,
  noTelemetryMeta: 'no telemetry in either window',
  metricsLogsOnly: 'metrics and logs only',
  roleCaller: 'caller',
  roleCallee: 'callee',
  tagFaultTarget: 'fault target',
  tagFaultPeer: 'fault peer',
  tagNoTraces: 'no traces',
  ghostWireTitle: (source: string, target: string) =>
    `${source} → ${target}: no calls observed in either window`,
  basisTitle: {
    'caller-spans':
      "Counted from the caller's own spans; the callee emits none",
    'callee-spans':
      "Counted from the consumer's own spans; the broker emits none",
  } satisfies Record<InferredBasis, string>,
  moreCallers: (n: number) => `+${String(n)} ${n === 1 ? 'caller' : 'callers'}`,
  moreCallees: (n: number) => `+${String(n)} ${n === 1 ? 'callee' : 'callees'}`,
  stubOf: (id: string) => `of ${id}`,

  /* Board */
  legendClaimed: 'under review',
  legendAlarm: 'error rate up',
  legendCaution: 'slower',
  legendNeutral: 'below thresholds',
  legendVanished: 'normal window only',
  legendNew: 'abnormal window only',
  legendInferred: "from one end's spans",
  legendGhost: 'claimed, never called',
  expandNeighbours: 'Add neighbours',
  expandNeighboursHint: 'Select a service to add its callers and callees',
  expandNeighboursOf: (id: string) =>
    `Add every service ${id} calls or is called by`,
  neighbourLinks: 'Links between neighbours',
  neighbourLinksHint:
    'Also draw calls between the services around the claimed link',
  wholeSystem: (n: number) => `Whole system · ${String(n)}`,
  wholeSystemHint: 'Draw every service in the case',
  focusReset: 'Focus',
  focusResetHint: 'Back to the services around the claimed link',
  boardLabel: (title: string) => `Call graph around ${title}`,

  /* Series */
  windowName: (name: string) =>
    name === 'normal' ? 'normal' : name === 'abnormal' ? 'abnormal' : name,
  injectionAt: (clock: string) => `injection ${clock} UTC`,
  rowCalls: 'Calls',
  rowErrors: 'Error rate',
  rowLatency: 'Latency',
  lineCalls: 'calls',
  lineErrors: 'errors',
  perWindow: (n: string, a: string) => `${n} → ${a} per window`,
  linkChartLabel: (source: string, target: string, seconds: number) =>
    `Calls, error rate and latency of ${source} → ${target}, every ${String(seconds)} s`,
  metricsChartLabel: (id: string) => `Metrics of ${id}, one line per instance`,

  /* Tables */
  colCalls: 'Calls',
  colP95: 'p95 ms',
  colChange: 'Change',
  colMeasure: 'Measure',
  colNormal: 'Normal',
  colAbnormal: 'Abnormal',
  rowP50: 'p50',
  rowP95: 'p95',
  colCaller: 'Caller',
  colCallee: 'Callee',
  colEndpoint: 'Endpoint',
  noCalls: 'No calls',
  noEndpoints: 'No endpoints recorded',

  /* Details panel */
  /** A node's kind as the API names it, e.g. `service`; unknown kinds pass through. */
  nodeKind: (kind: string) => kind,
  detailsLabel: 'Details',
  nothingSelected: 'Nothing selected',
  nothingSelectedHint: 'Click a wire or a chip on the board.',
  linkMissing: 'This link is not in the case',
  serviceMissing: 'This service is not in the case',
  linkUnderReview: 'Link under review',
  link: 'Link',
  verbCalls: 'calls',
  timeline: 'Timeline',
  noTimeline: 'No timeline for this link.',
  timelineFailed: 'Timeline did not load',
  allEndpoints: (n: number) => `All ${String(n)} endpoints`,
  endpointSelect: 'Endpoint',
  bothWindows: 'Both windows',
  bothWindowsOne: 'Both windows, one endpoint',
  byEndpoint: 'By endpoint',
  pairsAside: (n: number) => `${plural(n, 'pair', 'pairs')} · served ← called`,
  endpointOf: (id: string) => `${id} endpoint`,
  callsByEndpoint: (source: string, target: string) =>
    `Calls from ${source} to ${target} by endpoint`,
  everythingCalls: (id: string) => `Everything ${id} calls`,
  everythingCallsAside: 'did one callee change, or all of them?',
  callsFrom: (id: string) => `Calls from ${id}`,
  everythingCalling: (id: string) => `Everything that calls ${id}`,
  callsInto: (id: string) => `Calls into ${id}`,
  noCallsBetween: (source: string, target: string) =>
    `No ${source} → ${target} calls in either window`,
  noTelemetryFrom: (ids: string[]) =>
    `No telemetry from ${ids.join(' or ')} in either window: no spans, metrics or logs.`,
  calleesCount: (n: number) => plural(n, 'callee', 'callees'),
  noCallsFrom: (id: string) => `No calls from ${id}`,
  noCallsInto: (id: string) => `No calls into ${id}`,
  clientEndpoints: (id: string) => `${id} client endpoints`,
  clientEndpointsOf: (id: string) => `Client endpoints of ${id}`,
  basisNote: {
    'caller-spans':
      "Counted from the caller's own spans: the callee emits no traces, so these are the client or producer spans the caller sent to it (matched by span kind and name). Latency includes the network.",
    'callee-spans':
      "Counted from the consumer's own spans: the broker emits no traces, so these are the consumer's Consumer spans.",
  } satisfies Record<InferredBasis, string>,
  noTracesNote: 'This component has no traces, only metrics and logs.',
  noTelemetryNote:
    'No telemetry for this service in either window: no spans, metrics or logs.',
  spansServed: 'Spans served, both windows',
  tabCalls: 'Calls',
  tabMetrics: (n?: number) =>
    n === undefined ? 'Metrics' : `Metrics ${String(n)}`,
  tabLogs: (n?: number) => (n === undefined ? 'Logs' : `Logs ${String(n)}`),
  serviceTabs: 'Service details',
  callsServed: 'Calls served',
  endpointsCount: (n: number) => plural(n, 'endpoint', 'endpoints'),
  endpointsServedBy: (id: string) => `Endpoints ${id} serves`,
  callsNothing: 'Calls nothing',
  calledByNothing: 'Called by nothing',
  noDetail: 'No metrics or logs for this service',
  detailFailed: 'Service details did not load',
  noMetrics: 'No metrics for this service',
  metrics: 'Metrics',
  metricsAside: (metrics: number, instances: number) =>
    `${plural(metrics, 'metric', 'metrics')} · ${plural(instances, 'instance', 'instances')}`,
  noLogs: 'No log templates for this service',
  logsShown: 'Log templates shown',
  logsAll: (n: number) => `All ${String(n)}`,
  logsNew: (n: number) => `New ${String(n)}`,
  logsGone: (n: number) => `Gone ${String(n)}`,
  logsAside: 'normal → abnormal',
  logsOf: (id: string) => `Log templates of ${id}`,
  logNew: 'new',
  logGone: 'gone',

  /* Claim bar */
  caseDetails: 'Case details',
  previousItem: 'Previous item (K)',
  nextItem: 'Next item (J)',
  guideHint: 'How to judge (?)',
  guide: 'Guide',
  judgedProgress: 'judged',
  showItemList: 'Show the item list',

  /* Verdict dock */
  saving: 'Saving…',
  notSaved: (message: string) => `Not saved: ${message}`,
  savedAt: (clock: string) => `Saved ${clock} UTC`,
  notJudged: 'Not judged yet',
  verdict: 'Verdict',
  notePlaceholder:
    'Note: the numbers you relied on, e.g. p95 5.3 → 21.8 ms, rising before the injection',
  note: 'Note',
  setIt: 'Set it',
  advance: 'Next item after a verdict',

  /* Item rail */
  hideItemList: 'Hide the item list',
  itemsJudged: 'Items judged',
  showItems: 'Show items',
  filterAll: 'All',
  filterTodo: (n: number) => `To do ${String(n)}`,
  filterDone: 'Judged',
  filterPlaceholder: 'Filter by service or case',
  noMatch: 'No items match.',
  itemsFallback: 'Items',

  /* Workspace */
  caseOfItem: 'The case this item belongs to',
  windowFact: (name: string) => `${name} window`,
  injection: 'Injection',
  marker: 'Marker',
  caseFailed: 'The case did not load',
  noTopology: 'No topology for this case.',
  guideTitle: (title: string) => `How to judge: ${title}`,
  taskFailed: 'The task did not load',
  noItems: 'This task has no items',
  blockedReviewer: 'Set a reviewer name to save verdicts.',
  blockedReadOnly: 'This source is read-only: verdicts cannot be saved.',
  blockedVerdicts: (message: string) => `Verdicts did not load: ${message}`,

  /* Task list */
  reviewTasks: 'Review tasks',
  source: (url: string) => `Source: ${url}`,
  tasksFailed: 'Cannot load the tasks',
  tasksFailedHint: (url: string, message: string) =>
    `${url}: ${message}. Check the server, or the URL on the Connection page.`,
  noTasks: 'No tasks',
  noTasksHint: 'The source has no review tasks yet.',
  statItems: 'Items',
  statJudged: 'Judged',
  statJudgedBy: (reviewer: string) => `Judged by ${reviewer}`,
  groupJudged: (group: string, done: number, total: number) =>
    `${group}: ${String(done)} of ${String(total)} judged`,
  itemsCount: (n: number) => plural(n, 'item', 'items'),
  setReviewerHint:
    'No reviewer set, so verdicts cannot be saved yet. Set one on the Connection page.',
  connection: 'Connection',
  open: 'Open',

  /* Connection */
  connectionTitle: 'Connection',
  connectionHint:
    'Where the review data comes from and who is reviewing. Both stay in this browser.',
  sourceAndReviewer: 'Source and reviewer',
  sourceKind: 'Source',
  serverTitle: 'Review server',
  serverHint:
    'Reads from GET /api/review/… and saves each verdict with PUT, e.g. the reference server in packages/review-api/python.',
  staticTitle: 'Static folder',
  staticHint:
    'Reads <url>/<path>.json from any file host. Read-only: verdicts cannot be saved.',
  url: 'URL',
  urlEmpty: (url: string) => `Empty: ${url}.`,
  urlHint: 'The server or folder root, without /api/review.',
  reviewerName: 'Reviewer name',
  reviewerPlaceholder: 'e.g. alice',
  reviewerHint:
    'Your verdicts are saved under this name; use the same one every time.',
  reviewerInvalid: 'Letters, digits, dot, dash and underscore only',
  save: 'Save',
  defaultUrl: 'Use the default URL',
  status: 'Status',
  tasks: 'Tasks',
  unreachable: 'Cannot reach the source',
  server: 'Server',
  verdicts: 'Verdicts',
  reviewer: 'Reviewer',
  savedOnServer: 'saved on the server',
  readOnly: 'read-only',
  notSet: 'not set',
  thisConsole: 'this console',
  thisConsoleProxy: (target: string) => `this console (dev proxy to ${target})`,
  staticReadOnly: 'A static folder is read-only.',
};

export type ReviewStrings = typeof reviewEn;

export const reviewZhCN: ReviewStrings = {
  languageSwitch: '语言',

  changeLabel: {
    none: '两个窗口都没有调用',
    vanished: '只在正常窗口有调用',
    new: '只在故障窗口有调用',
    errors: '错误率上升',
    slower: '变慢',
    steady: '未超过阈值',
  },
  changeErr: (pp) => `错误 ${pp}`,
  changeGone: '消失',
  changeNew: '新增',
  thresholdNote: (pp, ratio) =>
    `故障窗口对比正常窗口 · 红：错误率上升 ≥ ${String(pp)} 个百分点 · 橙：p50 或 p95 ≥ ${String(ratio)} 倍 · 线宽：调用量`,

  noCallsEither: '两个窗口都没有调用',
  callsChange: (n, a) => `调用 ${n} → ${a}`,
  errorsChange: (n, a) => `错误率 ${n} → ${a}`,
  noSpansServed: '没有服务端 span',
  spansChange: (n, a) => `${n} → ${a} 个 span`,
  noTelemetryMeta: '两个窗口都没有遥测数据',
  metricsLogsOnly: '只有指标和日志',
  roleCaller: '调用方',
  roleCallee: '被调方',
  tagFaultTarget: '故障目标',
  tagFaultPeer: '故障对端',
  tagNoTraces: '无 trace',
  ghostWireTitle: (source, target) =>
    `${source} → ${target}：两个窗口都没有观测到调用`,
  basisTitle: {
    'caller-spans': '按调用方自身的 span 统计；被调方不产生 trace',
    'callee-spans': '按消费方自身的 span 统计；消息中间件不产生 trace',
  },
  moreCallers: (n) => `另外 ${String(n)} 个调用方`,
  moreCallees: (n) => `另外 ${String(n)} 个被调方`,
  stubOf: (id) => `属于 ${id}`,

  legendClaimed: '待判断的边',
  legendAlarm: '错误率上升',
  legendCaution: '变慢',
  legendNeutral: '未超过阈值',
  legendVanished: '只在正常窗口',
  legendNew: '只在故障窗口',
  legendInferred: '按一端的 span 推断',
  legendGhost: '声称存在但没有调用',
  expandNeighbours: '展开邻居',
  expandNeighboursHint: '先选中一个服务，再加入它的调用方和被调方',
  expandNeighboursOf: (id) => `加入 ${id} 调用的和调用它的所有服务`,
  neighbourLinks: '邻居之间的调用',
  neighbourLinksHint: '同时画出待判断边周围各服务之间的调用',
  wholeSystem: (n) => `整个系统 · ${String(n)}`,
  wholeSystemHint: '画出这个案例里的所有服务',
  focusReset: '聚焦',
  focusResetHint: '回到待判断边周围的服务',
  boardLabel: (title) => `${title} 周围的调用图`,

  windowName: (name) =>
    name === 'normal' ? '正常窗口' : name === 'abnormal' ? '故障窗口' : name,
  injectionAt: (clock) => `注入 ${clock} UTC`,
  rowCalls: '调用量',
  rowErrors: '错误率',
  rowLatency: '延迟',
  lineCalls: '调用',
  lineErrors: '错误率',
  perWindow: (n, a) => `每窗口 ${n} → ${a}`,
  linkChartLabel: (source, target, seconds) =>
    `${source} → ${target} 的调用量、错误率和延迟，每 ${String(seconds)} 秒一格`,
  metricsChartLabel: (id) => `${id} 的指标，每个实例一条线`,

  colCalls: '调用',
  colP95: 'p95 毫秒',
  colChange: '变化',
  colMeasure: '指标',
  colNormal: '正常',
  colAbnormal: '故障',
  rowP50: 'p50',
  rowP95: 'p95',
  colCaller: '调用方',
  colCallee: '被调方',
  colEndpoint: '接口',
  noCalls: '没有调用',
  noEndpoints: '没有记录到接口',

  nodeKind: (kind) =>
    ({
      service: '服务',
      database: '数据库',
      cache: '缓存',
      queue: '消息队列',
      gateway: '网关',
      loadgen: '压测客户端',
    })[kind] ?? kind,
  detailsLabel: '详情',
  nothingSelected: '未选中任何内容',
  nothingSelectedHint: '点击图上的连线或服务。',
  linkMissing: '这个案例里没有这条边',
  serviceMissing: '这个案例里没有这个服务',
  linkUnderReview: '待判断的边',
  link: '边',
  verbCalls: '调用',
  timeline: '时间线',
  noTimeline: '这条边没有时间线。',
  timelineFailed: '时间线加载失败',
  allEndpoints: (n) => `全部 ${String(n)} 个接口`,
  endpointSelect: '接口',
  bothWindows: '两个窗口对比',
  bothWindowsOne: '两个窗口对比（单个接口）',
  byEndpoint: '按接口',
  pairsAside: (n) => `${String(n)} 对 · 被调接口 ← 调用接口`,
  endpointOf: (id) => `${id} 的接口`,
  callsByEndpoint: (source, target) => `${source} 对 ${target} 的调用，按接口`,
  everythingCalls: (id) => `${id} 调用的所有服务`,
  everythingCallsAside: '是只有这一个被调方变了，还是全都变了？',
  callsFrom: (id) => `${id} 发出的调用`,
  everythingCalling: (id) => `调用 ${id} 的所有服务`,
  callsInto: (id) => `对 ${id} 的调用`,
  noCallsBetween: (source, target) =>
    `两个窗口都没有 ${source} → ${target} 的调用`,
  noTelemetryFrom: (ids) =>
    `两个窗口都没有 ${ids.join(' 或 ')} 的遥测数据：没有 span、指标或日志。`,
  calleesCount: (n) => `${String(n)} 个被调方`,
  noCallsFrom: (id) => `${id} 没有发出调用`,
  noCallsInto: (id) => `没有对 ${id} 的调用`,
  clientEndpoints: (id) => `${id} 的客户端接口`,
  clientEndpointsOf: (id) => `${id} 的客户端接口`,
  basisNote: {
    'caller-spans':
      '调用方自身的 span 推断：被调方不产生 trace，此处统计调用方发往它的 client/producer span（按 span 类型和名称匹配），延迟含网络。',
    'callee-spans':
      '消费方自身的 span 推断：消息中间件不产生 trace，此处统计消费方的 Consumer span。',
  },
  noTracesNote: '该组件没有 trace，只有指标和日志。',
  noTelemetryNote: '两个窗口都没有这个服务的遥测数据：没有 span、指标或日志。',
  spansServed: '服务端 span，两个窗口对比',
  tabCalls: '调用',
  tabMetrics: (n) => (n === undefined ? '指标' : `指标 ${String(n)}`),
  tabLogs: (n) => (n === undefined ? '日志' : `日志 ${String(n)}`),
  serviceTabs: '服务详情',
  callsServed: '提供的接口',
  endpointsCount: (n) => `${String(n)} 个接口`,
  endpointsServedBy: (id) => `${id} 提供的接口`,
  callsNothing: '不调用任何服务',
  calledByNothing: '没有服务调用它',
  noDetail: '这个服务没有指标或日志',
  detailFailed: '服务详情加载失败',
  noMetrics: '这个服务没有指标',
  metrics: '指标',
  metricsAside: (metrics, instances) =>
    `${String(metrics)} 个指标 · ${String(instances)} 个实例`,
  noLogs: '这个服务没有日志模板',
  logsShown: '显示的日志模板',
  logsAll: (n) => `全部 ${String(n)}`,
  logsNew: (n) => `新增 ${String(n)}`,
  logsGone: (n) => `消失 ${String(n)}`,
  logsAside: '正常 → 故障',
  logsOf: (id) => `${id} 的日志模板`,
  logNew: '新增',
  logGone: '消失',

  caseDetails: '案例详情',
  previousItem: '上一条 (K)',
  nextItem: '下一条 (J)',
  guideHint: '判断方法 (?)',
  guide: '判断方法',
  judgedProgress: '已判断',
  showItemList: '显示条目列表',

  saving: '保存中…',
  notSaved: (message) => `未保存：${message}`,
  savedAt: (clock) => `已保存 ${clock} UTC`,
  notJudged: '尚未判断',
  verdict: '结论',
  notePlaceholder:
    '备注：写下你依据的数字，例如 p95 5.3 → 21.8 毫秒，在注入之前就已上升',
  note: '备注',
  setIt: '去设置',
  advance: '给出结论后跳到下一条',

  hideItemList: '收起条目列表',
  itemsJudged: '已判断的条目',
  showItems: '显示的条目',
  filterAll: '全部',
  filterTodo: (n) => `待判断 ${String(n)}`,
  filterDone: '已判断',
  filterPlaceholder: '按服务或案例筛选',
  noMatch: '没有匹配的条目。',
  itemsFallback: '条目',

  caseOfItem: '这一条所属的案例',
  windowFact: (name) =>
    name === 'normal' ? '正常窗口' : name === 'abnormal' ? '故障窗口' : name,
  injection: '注入',
  marker: '标记',
  caseFailed: '案例加载失败',
  noTopology: '这个案例没有拓扑。',
  guideTitle: (title) => `判断方法：${title}`,
  taskFailed: '任务加载失败',
  noItems: '这个任务没有条目',
  blockedReviewer: '设置复核人名字后才能保存结论。',
  blockedReadOnly: '这个数据源是只读的：结论无法保存。',
  blockedVerdicts: (message) => `结论加载失败：${message}`,

  reviewTasks: '复核任务',
  source: (url) => `数据源：${url}`,
  tasksFailed: '无法加载任务',
  tasksFailedHint: (url, message) =>
    `${url}：${message}。请检查服务器，或在“连接”页修改 URL。`,
  noTasks: '没有任务',
  noTasksHint: '这个数据源还没有复核任务。',
  statItems: '条目',
  statJudged: '已判断',
  statJudgedBy: (reviewer) => `${reviewer} 已判断`,
  groupJudged: (group, done, total) =>
    `${group}：已判断 ${String(done)} / ${String(total)}`,
  itemsCount: (n) => `${String(n)} 条`,
  setReviewerHint: '还没有设置复核人，结论暂时无法保存。请在“连接”页设置。',
  connection: '连接',
  open: '打开',

  connectionTitle: '连接',
  connectionHint:
    '复核数据从哪里来，以及谁在复核。两项都只保存在这个浏览器里。',
  sourceAndReviewer: '数据源和复核人',
  sourceKind: '数据源',
  serverTitle: '复核服务器',
  serverHint:
    '通过 GET /api/review/… 读取，用 PUT 保存每条结论，例如 packages/review-api/python 里的参考服务器。',
  staticTitle: '静态文件夹',
  staticHint: '从任意文件服务读取 <url>/<path>.json。只读：结论无法保存。',
  url: 'URL',
  urlEmpty: (url) => `留空：${url}。`,
  urlHint: '服务器或文件夹的根地址，不含 /api/review。',
  reviewerName: '复核人名字',
  reviewerPlaceholder: '例如 alice',
  reviewerHint: '你的结论按这个名字保存；每次都用同一个名字。',
  reviewerInvalid: '只能包含字母、数字、点、短横线和下划线',
  save: '保存',
  defaultUrl: '使用默认 URL',
  status: '状态',
  tasks: '任务',
  unreachable: '无法连接数据源',
  server: '服务器',
  verdicts: '结论',
  reviewer: '复核人',
  savedOnServer: '保存在服务器上',
  readOnly: '只读',
  notSet: '未设置',
  thisConsole: '本控制台',
  thisConsoleProxy: (target) => `本控制台（开发代理到 ${target}）`,
  staticReadOnly: '静态文件夹是只读的。',
};

export const REVIEW_CATALOGUES: Record<ReviewLocale, ReviewStrings> = {
  en: reviewEn,
  'zh-CN': reviewZhCN,
};
