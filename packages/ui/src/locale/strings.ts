/** Every user-visible string a primitive renders on its own. */
export interface AegisStrings {
  copy: string;
  copied: string;
  copyToClipboard: string;
  plainTextLanguage: string;
  inspectorRendered: string;
  inspectorRaw: string;
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
  siteNavigation: string;
  /** Names a SiteAnchorNav, e.g. "On this page". */
  pageSections: string;
  siteFooterNavigation: string;
  showSidebar: string;
  hideSidebar: string;
  selectRow: string;
  selectAllRows: string;
  previousPage: string;
  nextPage: string;
  rowsPerPage: string;
  /** Joins a row range to its total, e.g. "1–25 of 469". */
  rangeOf: string;
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
  replayPlay: string;
  replayPause: string;
  replayPreviousStep: string;
  replayNextStep: string;
  replaySpeed: string;
  replayPosition: string;
  replayStepOf: (step: number, total: number) => string;
  replayKeyMoment: (n: number) => string;
  replaySteps: string;
  /** Heading of a ScrollStory's pinned panel, e.g. "Step 2 of 4". */
  scrollStoryPosition: (step: number, total: number) => string;
  cancel: string;
  save: string;
  apply: string;
  rename: string;
  delete: string;
  /** Names a button that deletes one named item, e.g. "Delete failed runs". */
  deleteNamed: (name: string) => string;
  /** Names the menu button of one named item. */
  moreActionsFor: (name: string) => string;
  retry: string;
  tryAgain: string;
  dismiss: string;
  clear: string;
  undo: string;
  download: string;
  send: string;
  pin: string;
  unpin: string;
  signIn: string;
  signOut: string;
  searchPlaceholder: string;
  suggestions: string;
  noItems: string;
  noData: string;
  noEvents: string;
  /** Short relative time, e.g. "5m ago"; past a week, the day itself. */
  relativeTime: (
    elapsed:
      | { unit: 'now' | 'yesterday' }
      | { unit: 'minutes' | 'hours' | 'days'; count: number }
      | { unit: 'date'; date: Date },
  ) => string;
  routeErrorTitle: string;
  environmentsUnavailable: string;
  /** The same, where the header has no room for the long form. */
  environmentsUnavailableShort: string;
  /** Tooltip over the environments error, after the error's own message. */
  environmentsRetry: (message: string) => string;
  switchEnvironment: string;
  agentPanel: string;
  showAgentPanel: string;
  hideAgentPanel: string;
  authChecking: string;
  authSignInTo: (appLabel: string) => string;
  authSignInDescription: string;
  authForbiddenTitle: string;
  authForbiddenRoles: (
    appLabel: string,
    requiredRoles: string[],
    userRoles: string[],
  ) => string;
  authForbidden: (appLabel: string) => string;
  authEmail: string;
  authPassword: string;
  authName: string;
  /** An example name in the sign-up form's name field. */
  authNamePlaceholder: string;
  authEmailRequired: string;
  authEmailInvalid: string;
  authNameRequired: string;
  authPasswordRequired: string;
  authPasswordTooShort: (minLength: number) => string;
  authPasswordHint: (minLength: number) => string;
  authRememberMe: string;
  authForgotPassword: string;
  authSigningIn: string;
  authCreateAccount: string;
  authCreatingAccount: string;
  authResetHint: string;
  authSendResetLink: string;
  authSending: string;
  showPassword: string;
  hidePassword: string;
  commandPaletteTitle: string;
  commandPalettePlaceholder: string;
  commandPaletteEmpty: string;
  /** The CommandPalette group of commands that name none. */
  commandGroupOther: string;
  commandStatus: (status: 'pending' | 'success' | 'error') => string;
  chatPlaceholder: string;
  chatMessage: string;
  chatSendMessage: string;
  chatHint: string;
  conversations: string;
  renameConversation: string;
  /** The second click that deletes a conversation. */
  confirmDelete: string;
  /** Describes a ContentInspectorDialog's content, e.g. "JSON content". */
  inspectorContentKind: (kind: 'json' | 'markdown' | 'sql' | 'text') => string;
  /** Marks a ContentPreview section found at more paths, e.g. "+2 duplicates". */
  contentDuplicates: (count: number) => string;
  dangerZone: string;
  resizeColumn: string;
  pageSize: string;
  dropzoneDropFolder: string;
  dropzoneDropFiles: string;
  dropzoneBrowseFolder: string;
  dropzoneBrowseFiles: string;
  dropzoneMaxSize: (size: string) => string;
  folderDropzoneHint: string;
  folderDropzoneSelected: (count: number, size: string) => string;
  folderDropzoneTooMany: (count: number, max: number) => string;
  folderDropzoneFileTooLarge: (
    name: string,
    size: string,
    max: string,
  ) => string;
  folderDropzoneTotalTooLarge: (total: string, max: string) => string;
  chooseFolder: string;
  chooseFiles: string;
  filePreviewLoading: string;
  filePreviewFailed: (reason: string) => string;
  pdfPreview: string;
  binaryFile: string;
  folders: string;
  expandFolders: string;
  collapseFolders: string;
  noSubPrefixes: string;
  /** Follows an ObjectBrowser's selection count, e.g. "3 Selected". */
  selected: string;
  parquetEmptyTitle: string;
  parquetEmptyDescription: string;
  parquetReadFailed: string;
  /** A ParquetViewer's row count, already formatted. */
  parquetRows: (count: string) => string;
  parquetColumns: (count: number) => string;
  parquetEmptyPage: string;
  selectProject: string;
  searchProjects: string;
  searchProjectsPlaceholder: string;
  noProjectsFound: string;
  queryPlaceholder: string;
  queryLabel: string;
  querySyntaxHelp: string;
  querySyntax: (
    kind: 'exact' | 'phrase' | 'wildcard' | 'range' | 'boolean' | 'grouping',
  ) => string;
  expandPanel: string;
  resizePanel: string;
  savedQueries: string;
  savedQueriesEmpty: string;
  renameSavedQuery: string;
  savedQueryName: string;
  savedQueryNamePlaceholder: string;
  saveCurrent: string;
  /** The chip that opens the saved queries that did not fit, e.g. "+3 more". */
  moreCount: (count: number) => string;
  sparkline: string;
  /** Read after a step's label, e.g. "(current step)". */
  stepStatus: (state: 'complete' | 'current' | 'unavailable') => string;
  terminalLabel: string;
  /** Names the ThemeToggle by what its next click does. */
  themeToggle: (preference: 'light' | 'dark' | 'system') => string;
  timeRangePlaceholder: string;
  /** A relative range on the TimeRangePicker trigger, e.g. "Last 15m". */
  timeRangeLast: (duration: string) => string;
  timeRangeExpression: string;
  timeRangeExpressionPlaceholder: string;
  timeRangeUnparseable: string;
  timeRangePresets: string;
  timeRangeAbsolute: string;
  timeRangeFrom: string;
  timeRangeTo: string;
  notSerialisable: (reason: string) => string;
  spanNotJson: string;
  traceSpans: string;
  uploadQueueEmptyTitle: string;
  uploadQueueEmptyDescription: string;
  uploadsDone: (done: number, total: number) => string;
  /** Time left on an upload, e.g. "ETA 2 min 3 s". */
  uploadEta: (duration: string) => string;
  uploadStatus: (status: 'queued' | 'uploading' | 'done' | 'error') => string;
  uploadFailed: string;
  cancelUpload: string;
  clearCompleted: string;
  /**
   * CodeMirror's own phrases (search panel, fold gutter, completions) in
   * this language, keyed by CodeMirror's English; empty keeps its English.
   */
  codeEditorPhrases: Readonly<Record<string, string>>;
}

export const enStrings: AegisStrings = {
  copy: 'Copy',
  copied: 'Copied',
  copyToClipboard: 'Copy to clipboard',
  plainTextLanguage: 'text',
  inspectorRendered: 'Rendered',
  inspectorRaw: 'Raw',
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
  siteNavigation: 'Site',
  pageSections: 'On this page',
  siteFooterNavigation: 'Footer',
  showSidebar: 'Show sidebar',
  hideSidebar: 'Hide sidebar',
  selectRow: 'Select row',
  selectAllRows: 'Select all rows',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  rowsPerPage: 'Rows per page',
  rangeOf: ' of ',
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
  replayPlay: 'Play',
  replayPause: 'Pause',
  replayPreviousStep: 'Previous step',
  replayNextStep: 'Next step',
  replaySpeed: 'Playback speed',
  replayPosition: 'Replay position',
  replayStepOf: (step, total) => `Step ${step} of ${total}`,
  replayKeyMoment: (n) => `Key moment ${n}`,
  replaySteps: 'Steps',
  scrollStoryPosition: (step, total) => `Step ${step} of ${total}`,
  cancel: 'Cancel',
  save: 'Save',
  apply: 'Apply',
  rename: 'Rename',
  delete: 'Delete',
  deleteNamed: (name) => `Delete ${name}`,
  moreActionsFor: (name) => `More actions for ${name}`,
  retry: 'Retry',
  tryAgain: 'Try again',
  dismiss: 'Dismiss',
  clear: 'Clear',
  undo: 'Undo',
  download: 'Download',
  send: 'Send',
  pin: 'Pin',
  unpin: 'Unpin',
  signIn: 'Sign in',
  signOut: 'Sign out',
  searchPlaceholder: 'Search…',
  suggestions: 'Suggestions',
  noItems: 'No items',
  noData: 'No data',
  noEvents: 'No events',
  relativeTime: (elapsed) => {
    switch (elapsed.unit) {
      case 'now':
        return 'just now';
      case 'minutes':
        return `${String(elapsed.count)}m ago`;
      case 'hours':
        return `${String(elapsed.count)}h ago`;
      case 'yesterday':
        return 'yesterday';
      case 'days':
        return `${String(elapsed.count)}d ago`;
      case 'date':
        return elapsed.date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
    }
  },
  routeErrorTitle: 'This page failed to render',
  environmentsUnavailable: 'Environments unavailable',
  environmentsUnavailableShort: 'Env error',
  environmentsRetry: (message) => `${message} Click to retry.`,
  switchEnvironment: 'Switch environment',
  agentPanel: 'Agent panel',
  showAgentPanel: 'Show agent panel',
  hideAgentPanel: 'Hide agent panel',
  authChecking: 'Checking your session…',
  authSignInTo: (appLabel) => `Sign in to use ${appLabel}`,
  authSignInDescription:
    'This app needs an authenticated session. Sign in to continue.',
  authForbiddenTitle: 'Insufficient permissions',
  authForbiddenRoles: (appLabel, requiredRoles, userRoles) =>
    `${appLabel} requires one of: ${requiredRoles.join(', ')}. Your roles: ${
      userRoles.length > 0 ? userRoles.join(', ') : '(none)'
    }.`,
  authForbidden: (appLabel) => `You don't have access to ${appLabel}.`,
  authEmail: 'Email',
  authPassword: 'Password',
  authName: 'Name',
  authNamePlaceholder: 'Ada Lovelace',
  authEmailRequired: 'Enter your email address.',
  authEmailInvalid: 'Enter a valid email address.',
  authNameRequired: 'Enter your name.',
  authPasswordRequired: 'Enter your password.',
  authPasswordTooShort: (minLength) =>
    `Password must be at least ${String(minLength)} characters.`,
  authPasswordHint: (minLength) => `At least ${String(minLength)} characters.`,
  authRememberMe: 'Remember me',
  authForgotPassword: 'Forgot password?',
  authSigningIn: 'Signing in…',
  authCreateAccount: 'Create account',
  authCreatingAccount: 'Creating account…',
  authResetHint: "We'll send a reset link to this address.",
  authSendResetLink: 'Send reset link',
  authSending: 'Sending…',
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  commandPaletteTitle: 'Commands',
  commandPalettePlaceholder: 'Type a command…',
  commandPaletteEmpty: 'No commands match.',
  commandGroupOther: 'Other',
  commandStatus: (status) =>
    ({ pending: 'pending', success: 'done', error: 'failed' })[status],
  chatPlaceholder: 'Ask the assistant…',
  chatMessage: 'Message',
  chatSendMessage: 'Send message',
  chatHint: 'Enter to send · Shift+Enter for newline',
  conversations: 'Conversations',
  renameConversation: 'Rename conversation',
  confirmDelete: 'Confirm?',
  inspectorContentKind: (kind) =>
    ({
      json: 'JSON content',
      markdown: 'Markdown content',
      sql: 'SQL content',
      text: 'Text content',
    })[kind],
  contentDuplicates: (count) =>
    `+${String(count)} ${count === 1 ? 'duplicate' : 'duplicates'}`,
  dangerZone: 'Danger zone',
  resizeColumn: 'Resize column',
  pageSize: 'Page size',
  dropzoneDropFolder: 'Drop folder to upload',
  dropzoneDropFiles: 'Drop to upload',
  dropzoneBrowseFolder: 'Drag a folder here or click to browse',
  dropzoneBrowseFiles: 'Drag files here or click to browse',
  dropzoneMaxSize: (size) => `max ${size}`,
  folderDropzoneHint: 'Drag a folder here, or choose one below',
  folderDropzoneSelected: (count, size) =>
    `${String(count)} ${count === 1 ? 'file' : 'files'} selected · ${size}`,
  folderDropzoneTooMany: (count, max) =>
    `Too many files: ${String(count)} selected, ${String(max)} allowed.`,
  folderDropzoneFileTooLarge: (name, size, max) =>
    `"${name}" is ${size}, over the ${max} per-file cap.`,
  folderDropzoneTotalTooLarge: (total, max) =>
    `Selection totals ${total}, over the ${max} aggregate cap.`,
  chooseFolder: 'Choose folder',
  chooseFiles: 'Choose files',
  filePreviewLoading: 'loading…',
  filePreviewFailed: (reason) => `preview failed: ${reason}`,
  pdfPreview: 'pdf preview',
  binaryFile: 'binary file',
  folders: 'Folders',
  expandFolders: 'Expand folders',
  collapseFolders: 'Collapse folders',
  noSubPrefixes: 'No sub-prefixes',
  selected: 'Selected',
  parquetEmptyTitle: 'No parquet file',
  parquetEmptyDescription: 'Pass a file or a src URL to inspect.',
  parquetReadFailed: 'Could not read the parquet file',
  parquetRows: (count) => `${count} rows`,
  parquetColumns: (count) => `${String(count)} cols`,
  parquetEmptyPage: 'No rows in this page',
  selectProject: 'Select a project',
  searchProjects: 'Search projects',
  searchProjectsPlaceholder: 'Search projects…',
  noProjectsFound: 'No projects found',
  queryPlaceholder: 'Search…  e.g. service.name:foo AND duration:>1000',
  queryLabel: 'Lucene query',
  querySyntaxHelp: 'LuceneQL syntax help',
  querySyntax: (kind) =>
    ({
      exact: 'exact match',
      phrase: 'phrase match',
      wildcard: 'wildcard',
      range: 'range / comparison',
      boolean: 'boolean operators',
      grouping: 'grouping',
    })[kind],
  expandPanel: 'Expand panel',
  resizePanel: 'Resize panel',
  savedQueries: 'Saved queries',
  savedQueriesEmpty: 'No saved queries yet — save the current view to pin it.',
  renameSavedQuery: 'Rename saved query',
  savedQueryName: 'Name this query',
  savedQueryNamePlaceholder: 'e.g. failed runs last 24h',
  saveCurrent: 'Save current',
  moreCount: (count) => `+${String(count)} more`,
  sparkline: 'sparkline',
  stepStatus: (state) =>
    ({
      complete: 'completed',
      current: 'current step',
      unavailable: 'not yet available',
    })[state],
  terminalLabel: 'Experiment log',
  themeToggle: (preference) =>
    ({
      light: 'Switch to dark theme',
      dark: 'Follow system theme',
      system: 'Switch to light theme',
    })[preference],
  timeRangePlaceholder: 'Select range',
  timeRangeLast: (duration) => `Last ${duration}`,
  timeRangeExpression: 'Expression',
  timeRangeExpressionPlaceholder: 'now-15m, yesterday 10am to today 11am, …',
  timeRangeUnparseable: 'Unparseable expression',
  timeRangePresets: 'Quick presets',
  timeRangeAbsolute: 'Absolute range',
  timeRangeFrom: 'From',
  timeRangeTo: 'To',
  notSerialisable: (reason) => `Not serialisable: ${reason}`,
  spanNotJson: 'The span cannot be shown as JSON',
  traceSpans: 'Trace spans',
  uploadQueueEmptyTitle: 'No uploads',
  uploadQueueEmptyDescription:
    'Drop files into the dropzone to start an upload.',
  uploadsDone: (done, total) => `${String(done)}/${String(total)} done`,
  uploadEta: (duration) => `ETA ${duration}`,
  uploadStatus: (status) =>
    ({
      queued: 'queued',
      uploading: 'uploading',
      done: 'done',
      error: 'failed',
    })[status],
  uploadFailed: 'upload failed',
  cancelUpload: 'Cancel upload',
  clearCompleted: 'Clear completed',
  codeEditorPhrases: {},
};

export const zhCNStrings: AegisStrings = {
  copy: '复制',
  copied: '已复制',
  copyToClipboard: '复制到剪贴板',
  plainTextLanguage: '文本',
  inspectorRendered: '阅读视图',
  inspectorRaw: '原始内容',
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
  siteNavigation: '站点导航',
  pageSections: '本页章节',
  siteFooterNavigation: '页脚导航',
  showSidebar: '显示侧边导航',
  hideSidebar: '隐藏侧边导航',
  selectRow: '选择此行',
  selectAllRows: '选择全部行',
  previousPage: '上一页',
  nextPage: '下一页',
  rowsPerPage: '每页',
  rangeOf: ' / 共 ',
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
  replayPlay: '播放',
  replayPause: '暂停',
  replayPreviousStep: '上一步',
  replayNextStep: '下一步',
  replaySpeed: '播放速度',
  replayPosition: '回放位置',
  replayStepOf: (step, total) => `第 ${step} 步 · 共 ${total} 步`,
  replayKeyMoment: (n) => `关键时刻 ${n}`,
  replaySteps: '步骤',
  scrollStoryPosition: (step, total) => `第 ${step} 步 · 共 ${total} 步`,
  cancel: '取消',
  save: '保存',
  apply: '应用',
  rename: '重命名',
  delete: '删除',
  deleteNamed: (name) => `删除“${name}”`,
  moreActionsFor: (name) => `“${name}”的更多操作`,
  retry: '重试',
  tryAgain: '重试',
  dismiss: '移除',
  clear: '清除',
  undo: '撤销',
  download: '下载',
  send: '发送',
  pin: '固定',
  unpin: '取消固定',
  signIn: '登录',
  signOut: '退出登录',
  searchPlaceholder: '搜索…',
  suggestions: '建议',
  noItems: '没有条目',
  noData: '暂无数据',
  noEvents: '暂无事件',
  relativeTime: (elapsed) => {
    switch (elapsed.unit) {
      case 'now':
        return '刚刚';
      case 'minutes':
        return `${String(elapsed.count)} 分钟前`;
      case 'hours':
        return `${String(elapsed.count)} 小时前`;
      case 'yesterday':
        return '昨天';
      case 'days':
        return `${String(elapsed.count)} 天前`;
      case 'date':
        return elapsed.date.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
        });
    }
  },
  routeErrorTitle: '页面渲染失败',
  environmentsUnavailable: '无法加载环境',
  environmentsUnavailableShort: '环境出错',
  environmentsRetry: (message) => `${message} 点击重试。`,
  switchEnvironment: '切换环境',
  agentPanel: 'Agent 面板',
  showAgentPanel: '显示 Agent 面板',
  hideAgentPanel: '隐藏 Agent 面板',
  authChecking: '正在检查登录状态…',
  authSignInTo: (appLabel) => `登录后使用 ${appLabel}`,
  authSignInDescription: '此应用需要登录，请登录后继续。',
  authForbiddenTitle: '权限不足',
  authForbiddenRoles: (appLabel, requiredRoles, userRoles) =>
    `${appLabel} 需要以下角色之一：${requiredRoles.join('、')}。你的角色：${
      userRoles.length > 0 ? userRoles.join('、') : '无'
    }。`,
  authForbidden: (appLabel) => `你没有 ${appLabel} 的访问权限。`,
  authEmail: '邮箱',
  authPassword: '密码',
  authName: '姓名',
  authNamePlaceholder: '张三',
  authEmailRequired: '请输入邮箱地址。',
  authEmailInvalid: '请输入有效的邮箱地址。',
  authNameRequired: '请输入姓名。',
  authPasswordRequired: '请输入密码。',
  authPasswordTooShort: (minLength) =>
    `密码至少需要 ${String(minLength)} 个字符。`,
  authPasswordHint: (minLength) => `至少 ${String(minLength)} 个字符。`,
  authRememberMe: '记住我',
  authForgotPassword: '忘记密码？',
  authSigningIn: '正在登录…',
  authCreateAccount: '创建账号',
  authCreatingAccount: '正在创建账号…',
  authResetHint: '我们会把重置链接发送到这个邮箱。',
  authSendResetLink: '发送重置链接',
  authSending: '正在发送…',
  showPassword: '显示密码',
  hidePassword: '隐藏密码',
  commandPaletteTitle: '命令',
  commandPalettePlaceholder: '输入命令…',
  commandPaletteEmpty: '没有匹配的命令。',
  commandGroupOther: '其他',
  commandStatus: (status) =>
    ({ pending: '等待中', success: '已完成', error: '失败' })[status],
  chatPlaceholder: '向助手提问…',
  chatMessage: '消息',
  chatSendMessage: '发送消息',
  chatHint: 'Enter 发送 · Shift+Enter 换行',
  conversations: '对话',
  renameConversation: '重命名对话',
  confirmDelete: '确认删除？',
  inspectorContentKind: (kind) =>
    ({
      json: 'JSON 内容',
      markdown: 'Markdown 内容',
      sql: 'SQL 内容',
      text: '文本内容',
    })[kind],
  contentDuplicates: (count) => `+${String(count)} 处重复`,
  dangerZone: '危险操作',
  resizeColumn: '调整列宽',
  pageSize: '每页条数',
  dropzoneDropFolder: '松开即可上传文件夹',
  dropzoneDropFiles: '松开即可上传',
  dropzoneBrowseFolder: '将文件夹拖到这里，或点击选择',
  dropzoneBrowseFiles: '将文件拖到这里，或点击选择',
  dropzoneMaxSize: (size) => `最大 ${size}`,
  folderDropzoneHint: '将文件夹拖到这里，或在下方选择',
  folderDropzoneSelected: (count, size) =>
    `已选择 ${String(count)} 个文件 · ${size}`,
  folderDropzoneTooMany: (count, max) =>
    `文件过多：已选择 ${String(count)} 个，最多允许 ${String(max)} 个。`,
  folderDropzoneFileTooLarge: (name, size, max) =>
    `“${name}”大小为 ${size}，超过单个文件上限 ${max}。`,
  folderDropzoneTotalTooLarge: (total, max) =>
    `所选文件共 ${total}，超过总大小上限 ${max}。`,
  chooseFolder: '选择文件夹',
  chooseFiles: '选择文件',
  filePreviewLoading: '正在加载…',
  filePreviewFailed: (reason) => `预览失败：${reason}`,
  pdfPreview: 'PDF 预览',
  binaryFile: '二进制文件',
  folders: '文件夹',
  expandFolders: '展开文件夹',
  collapseFolders: '收起文件夹',
  noSubPrefixes: '没有子前缀',
  selected: '项已选中',
  parquetEmptyTitle: '没有 Parquet 文件',
  parquetEmptyDescription: '传入文件或 src 地址即可查看。',
  parquetReadFailed: '无法读取 Parquet 文件',
  parquetRows: (count) => `${count} 行`,
  parquetColumns: (count) => `${String(count)} 列`,
  parquetEmptyPage: '此页没有数据',
  selectProject: '选择项目',
  searchProjects: '搜索项目',
  searchProjectsPlaceholder: '搜索项目…',
  noProjectsFound: '没有找到项目',
  queryPlaceholder: '搜索…  例如 service.name:foo AND duration:>1000',
  queryLabel: 'Lucene 查询',
  querySyntaxHelp: 'LuceneQL 语法帮助',
  querySyntax: (kind) =>
    ({
      exact: '精确匹配',
      phrase: '短语匹配',
      wildcard: '通配符',
      range: '范围 / 比较',
      boolean: '布尔运算符',
      grouping: '分组',
    })[kind],
  expandPanel: '展开面板',
  resizePanel: '调整面板宽度',
  savedQueries: '已保存的查询',
  savedQueriesEmpty: '还没有保存的查询，保存当前视图即可固定到这里。',
  renameSavedQuery: '重命名已保存的查询',
  savedQueryName: '为这个查询命名',
  savedQueryNamePlaceholder: '例如：最近 24 小时失败的运行',
  saveCurrent: '保存当前查询',
  moreCount: (count) => `还有 ${String(count)} 个`,
  sparkline: '迷你趋势图',
  stepStatus: (state) =>
    ({ complete: '已完成', current: '当前步骤', unavailable: '暂不可用' })[
      state
    ],
  terminalLabel: '实验日志',
  themeToggle: (preference) =>
    ({
      light: '切换到深色主题',
      dark: '跟随系统主题',
      system: '切换到浅色主题',
    })[preference],
  timeRangePlaceholder: '选择时间范围',
  timeRangeLast: (duration) => `最近 ${duration}`,
  timeRangeExpression: '表达式',
  timeRangeExpressionPlaceholder:
    '例如 now-15m 或 yesterday 10am to today 11am',
  timeRangeUnparseable: '无法解析这个表达式',
  timeRangePresets: '快捷范围',
  timeRangeAbsolute: '绝对时间范围',
  timeRangeFrom: '开始',
  timeRangeTo: '结束',
  notSerialisable: (reason) => `无法序列化：${reason}`,
  spanNotJson: '无法以 JSON 显示这个节点',
  traceSpans: '调用链节点',
  uploadQueueEmptyTitle: '没有上传任务',
  uploadQueueEmptyDescription: '将文件拖到上传区域即可开始上传。',
  uploadsDone: (done, total) => `已完成 ${String(done)}/${String(total)}`,
  uploadEta: (duration) => `剩余约 ${duration}`,
  uploadStatus: (status) =>
    ({
      queued: '排队中',
      uploading: '上传中',
      done: '已完成',
      error: '失败',
    })[status],
  uploadFailed: '上传失败',
  cancelUpload: '取消上传',
  clearCompleted: '清除已完成',
  codeEditorPhrases: {
    Find: '查找',
    Replace: '替换',
    next: '下一个',
    previous: '上一个',
    all: '全部',
    'match case': '区分大小写',
    regexp: '正则',
    'by word': '全字匹配',
    replace: '替换',
    'replace all': '全部替换',
    close: '关闭',
    'Go to line': '跳转到行',
    go: '跳转',
    'current match': '当前匹配',
    'on line': '所在行',
    'replaced $ matches': '已替换 $ 处匹配',
    'replaced match on line $': '已替换第 $ 行的匹配',
    'folded code': '已折叠的代码',
    unfold: '展开',
    to: '至',
    'Folded lines': '已折叠的行',
    'Unfolded lines': '已展开的行',
    'Fold line': '折叠此行',
    'Unfold line': '展开此行',
    Completions: '补全建议',
    'Control character': '控制字符',
    'Selection deleted': '已删除所选内容',
  },
};
