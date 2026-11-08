---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Fix the A–L primitives, plus Pagination, ParquetViewer and RegisterForm.

Breaking:

- `FileDropzone` drops its `items` prop and inline upload list; render an
  `UploadQueue` below it. The `FileDropzoneItem` type is now
  `UploadQueueItem`, exported from `UploadQueue`, and its `progress` is a
  0–1 fraction.
- `KeyValueList` drops `uppercaseKeys`. Keys render as muted labels and
  values in UI type with tabular figures, no longer in mono; wrap ids,
  paths and code in `MonoValue`.
- `CodeEditor` drops its `theme` prop; the editor takes its colours from
  the tokens, its syntax colours included: new `--syntax-*` tokens
  (keyword, string, number, property, comment, punctuation), drawn from
  the data palette, replace CodeMirror's light-only default highlighting.
  CodeMirror's own chrome follows the theme too: the selection (new
  `--code-selection` and `--code-selection-blur`), the cursor, the active
  line (new `--code-active-line`, shown while the editor has focus),
  matching brackets, the autocomplete popup (a panel whose selected option
  is inverted), the search panel and fold markers. Selected code keeps
  its syntax colours, and the editor shows the field focus: a brand
  border and `--focus-halo`.
  `@codemirror/language` and `@lezer/highlight` are now dependencies.
- `Pagination` is the one pager and the footer `DataTable` renders. It
  drops `unit`, shows the visible range ("1–25 of 137"), renders the page
  size select only when `pageSizeOptions` is given, and adds
  `pageRowCount` and `disabled`. Without `total`, Next stays enabled while
  the page is full. `PaginationProps` is exported, and
  `DataTablePagination` is the part of it a `DataTable` caller passes.
- `ContentInspectorDialog` is built on `Dialog` and drops `width`.
  `ContentPreview` moves to its own module. Text containing
  `<agent_contract>` is no longer treated as Markdown by default: pass the
  new `markdownPatterns` option to `prepareInspectableContent`,
  `ContentPreview` or `ContentInspectorDialog`.
- `BlastRadiusBar` requires an `ariaLabel`, the accessible name of its
  `role="meter"` track.
- `DataListColumn.label` is renamed `header`, as in `DataTable`. DataList
  is a table (a grid with `onSelect`), and rows are focusable and
  selectable only when `onSelect` is given. A selectable DataList is one
  tab stop, and ↑ ↓ Home End move between its rows.
- `RegisterForm` checks its name, email and password on submit, shows the
  errors on the fields, and passes trimmed name and email to `onSubmit`.
  `ForgotPasswordForm` checks the email before calling `onSubmit`.
  `LoginForm` requires its email and password the same way: until both
  are filled it neither submits to `action` nor calls `onSubmit`, which
  receives the email trimmed.
- `ChatSessionList` is a list of rows, each with a select button and a
  menu button, instead of a listbox. Arrow keys move between the select
  buttons. The menu button sets `aria-controls` and keeps keys from the
  host only while its menu is open, so Escape on a closed menu button
  reaches the host.
- `EventTable` rows are focusable, hoverable and keyboard-activated only
  when `onRowClick` is given.
- `DropdownMenu`'s `trigger` is the content of the button DropdownMenu
  renders, so never pass a `Button` (that nested a button in a button).
  The new `triggerTone` draws that button as a `Button` of the given tone;
  it also sets `aria-controls` while the menu is open. `ButtonTone` is
  exported.
- `FormRow` no longer clones its child. Pass `controlId` and put the same
  id on the one control the row names (inside an antd `Form.Item`, on the
  input): the label becomes `<label for>`, and the description's id is
  `${controlId}-description`, for the control's `aria-describedby`.
  Without `controlId` the row is a `role="group"` named by the label and
  described by the description, for several controls or a value that
  isn't a control. `TextField` (and so `PasswordField`) keeps a caller's
  `aria-describedby` alongside its own helper text.

Fixes:

- `FolderDropzone` and `FileDropzone` share one drop engine. Dropping a
  folder gives the files inside it, each with `webkitRelativePath` set as
  a folder picker sets it.
- `ChatComposer` no longer sends when Enter confirms an IME candidate, and
  its field shows the field focus: a brand border and `--focus-halo`. On a
  narrow screen the field shrinks rather than pushing Send out of the
  composer.
- `Alert` with `tone="error"` is announced as an alert.
- The auth forms use `Alert` and `Checkbox`, with one stylesheet each.
- `FormRow` stretches its control to the row's width at 768 px and below.
- `DataTable` resizes columns without re-rendering rows on every pointer
  move, saves widths when the drag ends or is cancelled, and its resize
  handles are focusable and move with the arrow, Home and End keys. A
  resizable last column no longer draws a horizontal scrollbar.
- A `DataTable` column without a `width` that declares a `minWidth` is laid
  out at that minimum, so it never renders narrower; columns with neither
  take the slack. A resize first fixes every column at its rendered width,
  within its bounds, so a key step or a drag moves the column edge by
  exactly that distance. Once resized, an empty filler column takes the
  width the columns leave, so they keep their widths and the table still
  fills its container. A resize handle reports the column's rendered width
  in `aria-valuenow` from the first render, and the half of it that
  overlaps the next header cell now takes the pointer.
- `EventTable` keeps its header aligned with the scrolling body, uses the
  library focus ring, and exposes `aria-rowcount` / `aria-rowindex`.
  `@tanstack/react-table` is no longer a dependency.
- `EventTable` and `DataList` keep `MonoValue` and `MetricLabel` readable
  in a selected (inverted) row.
- `EventTable` columns take `numeric`: right-aligned, in the numeric face
  with tabular figures. An empty `EventTable` counts its empty row in
  `aria-rowcount` and gives it `aria-rowindex`.
- `EventTable` no longer clips columns that don't fit: `flex` columns keep
  at least 120 px, and the table scrolls sideways with its header aligned
  to the rows.
- `FilePreview` starts each file's text preview from a clean state and
  reads MIME types with parameters and `+json` / `+xml` suffixes as text.
- `Collapse` panel ids no longer collide between two Collapses.
- `ColumnChart` reads a missing value with the locale's `noValue`.
- `ParquetViewer` pages with `Pagination` and shows `EmptyState` and
  `ErrorState`. Its title is set in the UI face, its row and column counts
  and its number columns in the numeric face with tabular figures rather
  than mono, its header wraps on a narrow screen, and the panel takes
  `--radius-lg`.
- `UploadQueue` sets sizes, speed and ETA in the numeric face with tabular
  figures rather than mono. On a narrow screen a row's file name truncates
  first, down to a floor, and then its figures, status and Cancel wrap
  inside the row instead of pushing Cancel past it. When the header
  summary wraps, no line starts or ends with a separator.
- `FolderDropzone` sets its helper text and summary slot in the UI face
  with tabular figures rather than mono; wrap paths in the summary in
  `MonoValue`. `ChatComposer`'s keyboard hint is set in the UI face.
