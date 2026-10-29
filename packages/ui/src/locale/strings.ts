/** Every user-visible string a primitive renders on its own. */
export interface AegisStrings {
  copy: string;
  copied: string;
  copyToClipboard: string;
  plainTextLanguage: string;
  inspectorRendered: string;
  inspectorRaw: string;
  openInInspector: string;
  openContent: (title: string) => string;
  inputTokens: string;
  outputTokens: string;
  loadingTrajectory: string;
  trajectoryLoadFailed: string;
  noMessages: string;
  noMessagesDescription: string;
  clearSearch: string;
  clearSelection: string;
  remove: string;
  close: string;
  breadcrumb: string;
  tableOfContents: string;
  switchApp: string;
  openNavigation: string;
  closeNavigation: string;
  /** The shell's first link, which moves keyboard focus past the header to the page. */
  skipToContent: string;
  showSidebar: string;
  hideSidebar: string;
  selectRow: string;
  selectAllRows: string;
  previousPage: string;
  nextPage: string;
  rowsPerPage: string;
  /** Joins a row range to its total, e.g. "1–25 of 469". */
  rangeOf: string;
  totalCount: (total: number, unit: string) => string;
  recordsUnit: string;
  /** Accessible value of a bar, e.g. "0.75 of 1.00". */
  barValue: (value: string, max: string) => string;
  /** Accessible text for a missing value (shown as an em dash). */
  noValue: string;
  paretoChartLabel: (xLabel: string, yLabel: string) => string;
  paretoEmptyTitle: string;
  /** Accessible summary of RunPips, e.g. "3 of 5 runs passed, 1 failed, 1 errored". */
  runPipsLabel: (counts: {
    passed: number;
    failed: number;
    errored: number;
    pending: number;
    total: number;
  }) => string;
  shareLinkSharing: string;
  shareLinkExpiresAfter: string;
  /** A share link lifetime preset, e.g. "15 min" or "7 days". */
  shareLinkTtl: (seconds: number) => string;
  shareLinkDisposition: string;
  shareLinkForceDownload: string;
  /** Time left on a generated link, e.g. "expires in 59m 12s". */
  shareLinkExpiresIn: (remaining: {
    hours: number;
    minutes: number;
    seconds: number;
  }) => string;
  shareLinkExpired: string;
  shareLinkCopy: string;
  shareLinkGenerate: string;
  shareLinkGenerating: string;
  shareLinkGenerateFailed: string;
  clipboardUnavailable: string;
  /** The TrajectoryTimeline header when it names no agent. */
  trajectoryHeading: string;
  trajectoryStatus: (status: 'running' | 'completed' | 'failed') => string;
  trajectoryActionType: (type: 'tool_call' | 'message' | 'internal') => string;
  trajectoryThought: string;
  trajectoryAction: string;
  trajectoryTool: string;
  trajectoryObservation: string;
  toolCallArguments: string;
  toolCallResult: string;
  toolCallError: string;
  toolCallStatus: (status: 'running' | 'ok' | 'error') => string;
  expandRow: string;
  collapseRow: string;
  resizeNameColumn: string;
  /** A TraceTree tooltip's timing, e.g. "start +1.2s · dur 300ms". */
  traceSpanTiming: (start: string, duration: string) => string;
  traceSpanStatus: (status: 'ok' | 'error' | 'unset') => string;
  traceSpanField: (
    field: 'name' | 'status' | 'kind' | 'start' | 'duration' | 'parent' | 'id',
  ) => string;
  inspectorOverview: string;
  inspectorAttributes: string;
  noAttributes: string;
  noAttributesDescription: string;
  inspectorTabs: string;
  maximizeInspector: string;
  restoreInspector: string;
  closeInspector: string;
  maximize: string;
  restore: string;
  timelineEmptyTitle: string;
  timelineEmptyDescription: string;
  /** Read before an Alert's content to name its tone, e.g. "Error:". */
  alertTone: (tone: 'info' | 'success' | 'warning' | 'error') => string;
  /** What assistive technology calls a Carousel region. */
  carouselRoleDescription: string;
  carouselPause: string;
  carouselPlay: string;
}

export const enStrings: AegisStrings = {
  copy: 'Copy',
  copied: 'Copied',
  copyToClipboard: 'Copy to clipboard',
  plainTextLanguage: 'text',
  inspectorRendered: 'Rendered',
  inspectorRaw: 'Raw',
  openInInspector: 'Open in inspector',
  openContent: (title) => `Open ${title}`,
  inputTokens: 'in',
  outputTokens: 'out',
  loadingTrajectory: 'Loading trajectory…',
  trajectoryLoadFailed: 'Failed to load trajectory',
  noMessages: 'No messages',
  noMessagesDescription: 'This session has no message records.',
  clearSearch: 'Clear search',
  clearSelection: 'Clear selection',
  remove: 'Remove',
  close: 'Close',
  breadcrumb: 'Breadcrumb',
  tableOfContents: 'Table of contents',
  switchApp: 'Switch app',
  openNavigation: 'Open navigation',
  closeNavigation: 'Close navigation',
  skipToContent: 'Skip to content',
  showSidebar: 'Show sidebar',
  hideSidebar: 'Hide sidebar',
  selectRow: 'Select row',
  selectAllRows: 'Select all rows',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  rowsPerPage: 'Rows per page',
  rangeOf: ' of ',
  totalCount: (total, unit) => `${String(total)} ${unit}`,
  recordsUnit: 'records',
  barValue: (value, max) => `${value} of ${max}`,
  noValue: 'No value',
  paretoChartLabel: (xLabel, yLabel) =>
    `Pareto front of ${yLabel} against ${xLabel}`,
  paretoEmptyTitle: 'No metrics configured',
  runPipsLabel: ({ passed, failed, errored, pending, total }) =>
    `${String(passed)} of ${String(total)} runs passed, ${String(failed)} failed, ${String(errored)} errored${pending > 0 ? `, ${String(pending)} pending` : ''}`,
  shareLinkSharing: 'Sharing',
  shareLinkExpiresAfter: 'Expires after',
  shareLinkTtl: (seconds) => {
    if (seconds < 3600) {
      return `${String(seconds / 60)} min`;
    }
    if (seconds < 86400) {
      return `${String(seconds / 3600)} hr`;
    }
    const days = seconds / 86400;
    return `${String(days)} ${days === 1 ? 'day' : 'days'}`;
  },
  shareLinkDisposition: 'Disposition',
  shareLinkForceDownload: 'Force download (attachment)',
  shareLinkExpiresIn: ({ hours, minutes, seconds }) => {
    if (hours > 0) {
      return `expires in ${String(hours)}h ${String(minutes)}m`;
    }
    if (minutes > 0) {
      return `expires in ${String(minutes)}m ${String(seconds)}s`;
    }
    return `expires in ${String(seconds)}s`;
  },
  shareLinkExpired: 'expired',
  shareLinkCopy: 'Copy link',
  shareLinkGenerate: 'Generate link',
  shareLinkGenerating: 'Generating…',
  shareLinkGenerateFailed: 'failed to generate link',
  clipboardUnavailable: 'clipboard unavailable',
  trajectoryHeading: 'agent trajectory',
  trajectoryStatus: (status) => status,
  trajectoryActionType: (type) => type,
  trajectoryThought: 'thought',
  trajectoryAction: 'action',
  trajectoryTool: 'tool',
  trajectoryObservation: 'observation',
  toolCallArguments: 'arguments',
  toolCallResult: 'result',
  toolCallError: 'error',
  toolCallStatus: (status) => status,
  expandRow: 'Expand',
  collapseRow: 'Collapse',
  resizeNameColumn: 'Resize name column',
  traceSpanTiming: (start, duration) => `start +${start} · dur ${duration}`,
  traceSpanStatus: (status) => status,
  traceSpanField: (field) => field,
  inspectorOverview: 'Overview',
  inspectorAttributes: 'Attributes',
  noAttributes: 'No attributes',
  noAttributesDescription: 'No attributes recorded on this span.',
  inspectorTabs: 'Inspector tabs',
  maximizeInspector: 'Maximize inspector',
  restoreInspector: 'Restore inspector',
  closeInspector: 'Close inspector',
  maximize: 'Maximize',
  restore: 'Restore',
  timelineEmptyTitle: 'No spans',
  timelineEmptyDescription: 'Nothing to plot yet.',
  alertTone: (tone) =>
    ({
      info: 'Info:',
      success: 'Success:',
      warning: 'Warning:',
      error: 'Error:',
    })[tone],
  carouselRoleDescription: 'carousel',
  carouselPause: 'Pause autoplay',
  carouselPlay: 'Resume autoplay',
};

export const zhCNStrings: AegisStrings = {
  copy: '复制',
  copied: '已复制',
  copyToClipboard: '复制到剪贴板',
  plainTextLanguage: '文本',
  inspectorRendered: '阅读视图',
  inspectorRaw: '原始内容',
  openInInspector: '展开阅读',
  openContent: (title) => `展开阅读：${title}`,
  inputTokens: '输入 token',
  outputTokens: '输出 token',
  loadingTrajectory: '正在读取执行过程…',
  trajectoryLoadFailed: '无法读取执行过程',
  noMessages: '没有消息',
  noMessagesDescription: '这次会话没有保存消息记录。',
  clearSearch: '清除搜索',
  clearSelection: '清除选择',
  remove: '移除',
  close: '关闭',
  breadcrumb: '页面导航',
  tableOfContents: '本文目录',
  switchApp: '切换应用',
  openNavigation: '打开导航',
  closeNavigation: '关闭导航',
  skipToContent: '跳到正文',
  showSidebar: '显示侧边导航',
  hideSidebar: '隐藏侧边导航',
  selectRow: '选择此行',
  selectAllRows: '选择全部行',
  previousPage: '上一页',
  nextPage: '下一页',
  rowsPerPage: '每页',
  rangeOf: ' / 共 ',
  totalCount: (total, unit) => `共 ${String(total)} ${unit}`,
  recordsUnit: '条记录',
  barValue: (value, max) => `${value} / ${max}`,
  noValue: '无数据',
  paretoChartLabel: (xLabel, yLabel) => `${yLabel} 对 ${xLabel} 的帕累托前沿`,
  paretoEmptyTitle: '未配置指标',
  runPipsLabel: ({ passed, failed, errored, pending, total }) =>
    `${String(total)} 次运行：通过 ${String(passed)}，未通过 ${String(failed)}，运行失败 ${String(errored)}${pending > 0 ? `，进行中 ${String(pending)}` : ''}`,
  shareLinkSharing: '分享',
  shareLinkExpiresAfter: '有效期',
  shareLinkTtl: (seconds) => {
    if (seconds < 3600) {
      return `${String(seconds / 60)} 分钟`;
    }
    if (seconds < 86400) {
      return `${String(seconds / 3600)} 小时`;
    }
    return `${String(seconds / 86400)} 天`;
  },
  shareLinkDisposition: '打开方式',
  shareLinkForceDownload: '强制下载（作为附件）',
  shareLinkExpiresIn: ({ hours, minutes, seconds }) => {
    if (hours > 0) {
      return `${String(hours)} 小时 ${String(minutes)} 分后过期`;
    }
    if (minutes > 0) {
      return `${String(minutes)} 分 ${String(seconds)} 秒后过期`;
    }
    return `${String(seconds)} 秒后过期`;
  },
  shareLinkExpired: '已过期',
  shareLinkCopy: '复制链接',
  shareLinkGenerate: '生成链接',
  shareLinkGenerating: '正在生成…',
  shareLinkGenerateFailed: '无法生成链接',
  clipboardUnavailable: '无法访问剪贴板',
  trajectoryHeading: '执行轨迹',
  trajectoryStatus: (status) =>
    ({ running: '运行中', completed: '已完成', failed: '失败' })[status],
  trajectoryActionType: (type) =>
    ({ tool_call: '工具调用', message: '消息', internal: '内部' })[type],
  trajectoryThought: '思考',
  trajectoryAction: '行动',
  trajectoryTool: '工具调用',
  trajectoryObservation: '观察',
  toolCallArguments: '参数',
  toolCallResult: '结果',
  toolCallError: '错误',
  toolCallStatus: (status) =>
    ({ running: '运行中', ok: '正常', error: '失败' })[status],
  expandRow: '展开',
  collapseRow: '收起',
  resizeNameColumn: '调整名称列宽度',
  traceSpanTiming: (start, duration) => `开始 +${start} · 耗时 ${duration}`,
  traceSpanStatus: (status) =>
    ({ ok: '正常', error: '失败', unset: '未标记' })[status],
  traceSpanField: (field) =>
    ({
      name: '名称',
      status: '状态',
      kind: '类型',
      start: '开始',
      duration: '耗时',
      parent: '上级',
      id: '编号',
    })[field],
  inspectorOverview: '概览',
  inspectorAttributes: '属性',
  noAttributes: '没有属性',
  noAttributesDescription: '这个节点没有记录属性。',
  inspectorTabs: '详情标签页',
  maximizeInspector: '放大详情面板',
  restoreInspector: '还原详情面板',
  closeInspector: '关闭详情面板',
  maximize: '放大',
  restore: '还原',
  timelineEmptyTitle: '没有时间区间',
  timelineEmptyDescription: '暂无可绘制的内容。',
  alertTone: (tone) =>
    ({ info: '提示：', success: '成功：', warning: '注意：', error: '错误：' })[
      tone
    ],
  carouselRoleDescription: '轮播',
  carouselPause: '暂停自动播放',
  carouselPlay: '继续自动播放',
};
