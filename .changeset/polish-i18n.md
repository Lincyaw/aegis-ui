---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Breaking:

- `AegisStrings` lost `totalCount` and `recordsUnit`, which no primitive
  read, and gained 144 keys. A host that builds its own catalogue object
  must drop the two keys and add the new ones; a host that spreads
  `enStrings` or `zhCNStrings` only has to drop an override of a removed
  key.
- Every string and accessible name that a primitive or the shell renders on
  its own now comes from the catalogue, so a `zhCNStrings` host sees it in
  Chinese. Props that defaulted to English text (`CommandPalette` `title`
  and `placeholder`, `SearchInput`, `ChatComposer`, `ProjectSelector`,
  `QueryAutocomplete` and `TimeRangePicker` `placeholder`, `DangerZone`
  `title`, `DataList` `emptyText`, `DataTable` and `EventTable`
  `emptyTitle`, `EnvironmentSwitcher`, `SparkLine`, `Terminal` and
  `TraceTree` `ariaLabel`) take their default from the catalogue and still
  override it.
- `CommandPalette` files a command with no `group` under the catalogue's
  `commandGroupOther` (`Other`, `其他`), so a `groupOrder` that names the
  ungrouped bucket must use that value.
- `SavedQueryBar`'s chip menu button is named `More actions for <name>`,
  like the other row menus, instead of `Options for <name>`.
- `FilePreview` and `ParquetViewer` show a non-`Error` rejection as its
  string instead of a fixed English message.

Added keys:

- Actions and states: `cancel`, `save`, `apply`, `rename`, `delete`,
  `deleteNamed`, `moreActionsFor`, `retry`, `tryAgain`, `dismiss`, `clear`,
  `undo`, `download`, `send`, `pin`, `unpin`, `signIn`, `signOut`,
  `searchPlaceholder`, `suggestions`, `noItems`, `noData`, `noEvents`,
  `relativeTime`, `selected`, `moreCount`.
- Shell: `routeErrorTitle`, `environmentsUnavailable`,
  `environmentsUnavailableShort`, `environmentsRetry`, `switchEnvironment`,
  `agentPanel`, `showAgentPanel`, `hideAgentPanel`.
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
  `dangerZone`, `resizeColumn`, `pageSize`, `notSerialisable`,
  `spanNotJson`, `traceSpans`, `sparkline`, `stepStatus`, `terminalLabel`,
  `themeToggle`, `codeEditorPhrases` (CodeMirror's search, go-to-line,
  fold and completion phrases).
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

- `Carousel` balances a tab label that wraps, so a four-character Chinese
  label breaks two and two instead of three and one.

Console:

- The gallery header has an English / 中文 switch that renders every
  specimen with `enStrings` or `zhCNStrings`; `?lang=zh-CN` keeps the
  choice in a review link.
