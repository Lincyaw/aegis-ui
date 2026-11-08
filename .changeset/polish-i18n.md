---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Breaking:

- `AegisStrings` lost `totalCount` and `recordsUnit`, which no primitive
  read, and gained 150 keys. A host that builds its own catalogue object
  must drop the two keys and add the new ones; a host that spreads
  `enStrings` or `zhCNStrings` only has to drop an override of a removed
  key.
- `TimeRange`, which `parseTimeRangeInput` and `parseRelativeTime` return,
  no longer carries an English `label`. It is a union on `kind`: a
  `RelativeTimeRange` (`kind: 'relative'`) adds the `amount` and `unit` of
  a `now-<duration>` expression, e.g. `now-15m` is `15` `'minute'`, and an
  `AbsoluteTimeRange` (`kind: 'absolute'`) has only `from` and `to`. Word a
  range with the catalogue's `timeRangeLast({ amount, unit })` and
  `formatDateTime(date)`. The new types `RelativeTimeRange`,
  `AbsoluteTimeRange` and `TimeRangeUnit` are exported.
- The text and accessible names that the primitives and the shell render on
  their own come from the catalogue, so a `zhCNStrings` host sees them in
  Chinese. Props that defaulted to English text (`CommandPalette` `title`
  and `placeholder`, `SearchInput`, `ChatComposer`, `ProjectSelector`,
  `QueryAutocomplete` and `TimeRangePicker` `placeholder`, `DangerZone`
  `title`, `DataList` `emptyText`, `DataTable` and `EventTable`
  `emptyTitle`, `EnvironmentSwitcher`, `SparkLine`, `Terminal` and
  `TraceTree` `ariaLabel`) take their default from the catalogue and still
  override it. One known exception: `DiffViewer`'s line-number titles
  (`Added line`, `Removed line`) and its `expand` / `fold` controls are
  drawn by react-diff-viewer-continued, which takes no text for them, so
  they stay English.
- `CommandPalette` files a command with no `group` under the catalogue's
  `commandGroupOther` (`Other`, `其他`), so a `groupOrder` that names the
  ungrouped bucket must use that value.
- `SavedQueryBar`'s chip menu button is named `More actions for <name>`,
  like the other row menus, instead of `Options for <name>`.
- `RouteErrorBoundary`'s button reads `Retry` instead of `Try again`, the
  same word as every other retry.
- `FilePreview` and `ParquetViewer` show a non-`Error` rejection as its
  string instead of a fixed English message.

Added keys:

- Actions and states: `cancel`, `save`, `apply`, `rename`, `delete`,
  `deleteNamed`, `moreActionsFor`, `retry`, `dismiss`, `clear`, `undo`,
  `download`, `send`, `pin`, `unpin`, `signIn`, `signOut`,
  `searchPlaceholder`, `suggestions`, `noItems`, `noData`, `noEvents`,
  `relativeTime`, `formatDateTime`, `selectionCount`, `moreCount`.
- Shell: `routeErrorTitle`, `environmentsUnavailable`,
  `environmentsUnavailableShort`, `environmentsRetry`, `switchEnvironment`,
  `agentPanel`, `showAgentPanel`, `hideAgentPanel`, `avatarStatus`.
- Auth: `authChecking`, `authSignInTo`, `authSignInDescription`,
  `authForbiddenTitle`, `authForbiddenRoles`, `authForbidden`, `authEmail`,
  `authPassword`, `authName`, `authNamePlaceholder`, `authEmailRequired`,
  `authEmailInvalid`, `authNameRequired`, `authPasswordRequired`,
  `authPasswordTooShort`, `authPasswordHint`, `authRememberMe`,
  `authForgotPassword`, `authSigningIn`, `authCreateAccount`,
  `authCreatingAccount`, `authResetHint`, `authSendResetLink`,
  `authSending`, `showPassword`, `hidePassword`.
- Commands and chat: `commandPaletteTitle`, `commandPalettePlaceholder`,
  `commandPaletteEmpty`, `commandGroupOther`, `commandStatus`,
  `chatPlaceholder`, `chatMessage`, `chatSendMessage`, `chatHint`,
  `conversations`, `renameConversation`, `confirmDelete`.
- Content and tables: `inspectorContentKind`, `contentDuplicates`,
  `contentRoot`, `dangerZone`, `resizeColumn`, `pageSize`,
  `notSerialisable`, `spanNotJson`, `traceSpans`, `sparkline`,
  `stepStatus`, `terminalLabel`, `themeToggle`, `codeEditorPhrases`
  (CodeMirror's search, go-to-line, fold and completion phrases).
- Service map: `serviceMapAriaLabels` (React Flow's control, minimap and
  keyboard-help text, passed as its `ariaLabelConfig`),
  `serviceMapNodeRole`, `serviceMapEdgeRole`, `serviceMapEdgeName`.
- Files: `dropzoneDropFolder`, `dropzoneDropFiles`, `dropzoneBrowseFolder`,
  `dropzoneBrowseFiles`, `dropzoneMaxSize`, `folderDropzoneHint`,
  `folderDropzoneSelected`, `folderDropzoneTooMany`,
  `folderDropzoneFileTooLarge`, `folderDropzoneTotalTooLarge`,
  `chooseFolder`, `chooseFiles`, `filePreviewLoading`, `filePreviewFailed`,
  `pdfPreview`, `binaryFile`, `folders`, `expandFolders`,
  `collapseFolders`, `noSubPrefixes`, `parquetEmptyTitle`,
  `parquetEmptyDescription`, `parquetReadFailed`, `parquetRows`,
  `parquetColumns`, `parquetEmptyPage`, `uploadQueueEmptyTitle`,
  `uploadQueueEmptyDescription`, `uploadsDone`, `uploadEta`,
  `uploadStatus`, `uploadFailed`, `cancelUpload`, `clearCompleted`.
- Pickers and queries: `selectProject`, `searchProjects`,
  `searchProjectsPlaceholder`, `noProjectsFound`, `queryPlaceholder`,
  `queryLabel`, `querySyntaxHelp`, `querySyntax`, `expandPanel`,
  `resizePanel`, `savedQueries`, `savedQueriesEmpty`, `renameSavedQuery`,
  `savedQueryName`, `savedQueryNamePlaceholder`, `saveCurrent`,
  `timeRangePlaceholder`, `timeRangeLast`, `timeRangeExpression`,
  `timeRangeExpressionPlaceholder`, `timeRangeUnparseable`,
  `timeRangePresets`, `timeRangeAbsolute`, `timeRangeFrom`, `timeRangeTo`.

Fixes:

- Counts read in the right number, e.g. `1 row`, `1 column`,
  `At least 1 character.` and `1 of 1 run passed`. The catalogue formats
  the numbers it shows in its own locale, and `enStrings` formats dates in
  English whatever the browser's language.
- `Avatar`'s presence dot is an image named by its status in the
  catalogue's language (`Busy`, `忙碌`) instead of the raw `busy`.
- The zh-CN empty states share one form (`暂无条目`, `暂无上传任务`,
  `暂无属性`), and the resize handles one wording (`调整…宽度`).
- `Carousel` balances a tab label that wraps, so a four-character Chinese
  label breaks two and two instead of three and one.

Console:

- The gallery header has an English / 中文 switch that renders every
  specimen with `enStrings` or `zhCNStrings`; `?lang=zh-CN` keeps the
  choice in a review link.
