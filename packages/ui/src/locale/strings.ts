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
  switchApp: string;
  openNavigation: string;
  closeNavigation: string;
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
  switchApp: 'Switch app',
  openNavigation: 'Open navigation',
  closeNavigation: 'Close navigation',
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
  switchApp: '切换应用',
  openNavigation: '打开导航',
  closeNavigation: '关闭导航',
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
};
