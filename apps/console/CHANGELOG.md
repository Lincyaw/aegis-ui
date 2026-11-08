# @lincyaw/console

## 0.3.8

### Patch Changes

- ba74aca: Give each kind of change one motion, shared across primitives:
  - Tabs' indicator leads with the edge facing the move and trails with the
    far edge, so it stretches across and settles (`--motion-lead`,
    `--motion-trail`).
  - DataTable, EventTable, ObjectBrowser and TimelineChart develop their
    loaded content out of a soft blur when it replaces the skeleton
    (`--motion-develop`, `--motion-develop-blur`); Reveal rises out of the
    same blur, and its stagger stops growing after
    `--motion-reveal-stagger-max` siblings.
  - StatBlock, MetricCard and HeadlineStat roll a changed value's digits,
    right column first (`--motion-roll`); screen readers and copy still read
    the value whole.
  - CodeBlock and MetadataList copy buttons merge their two pages and draw a
    check.
  - ToolCallCard's running label carries a scanning band of brighter ink.
  - antd popovers and tooltips fade in from their trigger's side instead of
    zooming (`--motion-popover-offset`), and every antd easing maps onto the
    token curves, so nothing in antd overshoots.

  The gallery's Shape, elevation & motion panel lists the new tokens and
  plays the select, roll and develop moments.

- 3aed0c8: Make the agent runtime and its transports safe to hand to an outside agent.

  Breaking:
  - `AegisRuntime.waitFor` takes an `AegisWaitCondition` (a ref present or
    absent, a route, text, or a field value) instead of a JavaScript
    predicate string, which it no longer compiles. The timeout is capped at
    20 s and a timeout rejects with the new `timeout` error code.
  - `AegisRuntime.search` resolves to `{ results, failedProviders }`
    instead of an array; a search provider that throws is listed in
    `failedProviders` instead of silently returning nothing.
  - `AegisRuntime.dispatch` no longer takes `force`. It refuses an action
    whose `invocableBy` excludes the caller (`unavailable`), and refuses an
    agent dispatch of an action marked `confirm.danger` (`needs_confirm`).
  - `AegisRuntime.toMcpTools()` and the `McpToolDefinition` type are removed.
  - `listActions({ invocableBy })` keeps actions left at `'both'`.
  - The built-in `aegis.navigate` action (and the `aegis_navigate` tool)
    resolves `to` from the current route as a URL path resolves and hands
    the router a path from the app's root. It refuses, with
    `invalid_params`, a URL on another origin or protocol, including
    `javascript:`, `data:` and `blob:` URLs, and a full URL outside the
    router's basename. `AegisShell` reports its basename, so full URLs work
    on every route under it; without a reported basename the runtime infers
    it from the route and refuses any full URL where the route cannot tell
    it (a root route, a stale route, or no shell). A path that resolves to
    `//host` keeps one leading slash.
  - MCP tools: `aegis_invoke` with `dryRun: true` previews the action
    instead of running it, and its `force` is gone; `aegis_snapshot` drops
    the `paths` it ignored; `aegis_wait_for` takes a `condition`;
    `aegis_search` takes only a positive integer `limit`. A failed action or
    navigation now comes back as a tool error.
  - `AskOverlay` takes over the right-click menu only when an
    `<AgentChatProvider>` is above it. `AskPanel` sends through a new
    `onSend` prop (with `sending`) instead of a Send button that was always
    disabled; the overlay passes the question to the agent chat.
  - `AskPanel` with `popover={false}` no longer closes on Escape or on a
    click outside it; only its close button closes an inline panel.

  Added:
  - `AegisRuntime.preview(id, params)`, returning the action and its
    `dryRun()` output without running it; `PreviewResult`.
  - `ShellSnapshot.route.basename`, the path the router puts in front of
    every route; `AegisShell` fills it in.
  - `AegisActionDescriptor.confirm`; the `ActionConfirm`,
    `AegisSearchResponse`, `AegisWaitCondition` and `WaitForOptions` types.
  - A `signal` option on `dispatch` and `preview`, passed to the action as
    `ctx.signal`; the MCP bridge aborts it when its socket closes. A
    `dryRun` gets a `ctx.navigate` that does nothing.
  - `AskOverlay`'s `scope` prop (`AskOverlayProps`), the element itself
    rather than a ref, so the overlay follows an element that mounts late
    or is replaced: a scoped overlay answers only inside its element, under
    its own chat, and the page's overlay leaves that element alone. Opening
    one overlay's panel closes any other overlay's panel.
  - `AgentmChannelProvider` restarts the conversation from
    `initialMessages` when `channel.chatId` changes, in the same render, so
    a host switching chats no longer has to remount it with a `key`.

  Fixed:
  - A surface's `actionIds` (and `inspect`) now list the actions rendered
    inside it and those bound through `appliesTo.surfaceKind`.
  - The MCP bridge answers on the socket a call arrived on, reports a reply
    that cannot be serialized as a tool error, aborts pending `waitFor`
    calls when its socket closes, stops retrying when the bridge refuses the
    page, resets its backoff only once a connection is accepted, gives a
    duplicated tab its own session id, and leaves the query string and
    fragment out of the URL it reports.
  - The AgentM client rejects malformed frames, ignores events from a
    socket it has replaced, and `connect()` replaces the current connection;
    `AgentmChannelProvider` re-enables sending when the connection drops,
    and under React StrictMode it no longer drops the chunks of a streamed
    reply.
  - `highlight` escapes ids in its selector, scrolls instantly under reduced
    motion, and returns the element's position after the scroll settles.
  - `AskPanel`'s tool list picks up actions and surfaces registered after
    the panel opens. Its title uses the UI face, its field labels are no
    longer uppercase, its empty note is no longer italic, the panel takes
    `--radius-lg`, and its close button shows the focus ring.
  - A bridge `tool.call` whose arguments are not an object gets an
    `invalid_params` reply instead of no reply.
  - The library build no longer writes into `apps/console`; the console's
    `bundle:prepare` and `pnpm gen:mcp-tools` generate the MCP tool list.

- 8439df6: Breaking:
  - `CommandPalette`, `InboxPage`, `NotificationBell` and `SavedQueryBar` are
    presentational and take their data and callbacks as props:
    - `CommandPalette` takes `open`, `commands`, `onSelect`, `onClose` and an
      optional `groupOrder` (group labels in display order; unlisted groups
      follow alphabetically, and ungrouped commands join "Other", last unless
      listed). It is built on
      `Dialog` — focus trap, focus restore, scroll lock — with a combobox
      field over a listbox (`aria-activedescendant`). The unwired `>` and `?`
      modes are gone, and Escape is handled by the dialog alone, so it no
      longer closes the palette during an IME composition.
      `AegisShell enableCommandPalette` still mounts it from
      `<CommandProvider>`; set the order with the new `commandGroupOrder`.
    - `InboxPage` takes `items`, `unreadCount`, `onOpen` and `onMarkAllRead`;
      `NotificationBell` takes `items`, `unreadCount`, `onOpen`, `inboxPath`
      and a `linkComponent` for "View all". Neither imports react-router any
      more. Mount the new `ShellInboxPage` (filled from
      `<NotificationProvider>`, marks items read and follows their `to`) on
      the route `AegisShell inboxPath` names; the shell's bell is filled the
      same way. `Shell*` names the wrappers that fill a primitive from its
      provider.
    - `SavedQueryBar` takes `queries`, `onSave`, `onRename`, `onRemove` and
      `onTogglePinned` instead of `namespace`. `useSavedQueries({ namespace })`
      still keeps them in localStorage; call its `touch` in `onApply`.
  - App environments are loaded by the app, not fetched by the library:
    `AegisApp.apiBaseUrl` is removed, and `AegisApp.environments` is now
    `{ load(signal), fallback?, storageKey? }`. `load` resolves the manifest,
    `null` when the backend declares none (then `fallback`, if given, is the
    current environment), or rejects — the header then shows the failure and
    retries on click, and `useEnvironmentManifest()` reports
    `{ status: 'error', error, retry }`. `discoveryPath` and
    `fallback: 'production' | 'hidden'` are gone, as are `fetchManifest`,
    `validateManifest`, `manifestUrl` and `clearManifestCache`.
    `EnvironmentChangedEventDetail.fromEnvId` is always a string.
  - `Command.action` is removed; commands reach agents through the registry.
  - The `aegisTheme` export is removed; use `getAegisTheme(resolved)`.

  Added:
  - `isAppVisible(app, status, user)` — the rule the shell uses to show an
    app to the current user.
  - `AegisShell` catches a page that throws while rendering and shows the
    error with a retry in the page area; navigating elsewhere clears it.
  - `CommandPaletteProps`, `InboxPageProps` and `NotificationBellProps` types.
  - `NotificationContextValue.error` — why the last load failed, `null` once
    one succeeds. `InboxPage` takes `error` and `onRetry` and shows the
    failure with a retry in place of the list; `ShellInboxPage` passes
    the provider's `error` and `refetch` through.

  Fixed:
  - `useRegisterCommands` runs the latest render's `handler` and `undo`, and
    re-registers when a label, shortcut, scope or other described field
    changes.
  - `parseTimeRangeInput` reads two separate dates (e.g. two pasted
    timestamps) as the range's start and end.
  - `QueryAutocomplete` suggests values inside an opened quote
    (`service:"fro`).
  - `AegisShell` decides a route is bare from the route react-router
    matched, so params, relative paths and trailing slashes work.
  - Switching apps while one's environments load no longer leaves the next
    app loading.
  - The sidebar's collapsed state, `useResizable`'s stored width and
    `useSavedQueries` read storage after hydration, so a server render
    hydrates cleanly; `useResizable` writes storage when a drag ends instead
    of on every frame. `ThemeProvider` leaves the theme `themeInitScript`
    set alone until hydration ends.
  - InboxPage shows notification severity `warning` in the caution tone;
    the anomaly tone is kept for `error`.
  - At 768 px and below the shell header keeps its brand and actions on one
    row: the brand truncates first, the environment switcher shows only its
    badge dot, and a failed environment load reads "Env error".
  - `SavedQueryBar`'s save field gets a unique id, so two bars on one page
    no longer share a label target.
  - At 768 px and below the menu toggle, an app's own header row and the
    page content share one inline edge, and the closed navigation drawer is
    hidden once it has slid out, so it casts no shadow at the screen edge
    and its links leave the tab order.
  - At 768 px and below the open navigation drawer is modal: focus moves to
    its first link, with reduced motion too, the rest of the shell but the
    menu toggle is inert, and Escape or the backdrop closes it and returns
    focus to the toggle, which reports `aria-expanded` and reads "Close
    navigation" while the drawer is open. Widening the window past 768 px
    closes it.
  - `TableOfContents` and `SiteAnchorNav` pick the current section again
    when content around the sections grows, shrinks, arrives or leaves (a
    diagram or image rendering), instead of waiting for the next scroll.
  - Firefox draws scrollbars in the theme's colours, so the dark theme no
    longer shows light scrollbars.
  - Links show the focus ring on keyboard focus: antd's global link reset
    (`a:focus`, `a:hover { outline: 0 }`) no longer removes it. The shell's
    sidebar links draw it inset, so the scrolling sidebar does not clip it.
  - antd controls (buttons, breadcrumb, pagination, menu, tabs, checkbox,
    radio, switch and the rest) draw their keyboard focus ring in
    `--focus-ring-color` instead of the ink primary.

- c544362: Fix the A–L primitives, plus Pagination, ParquetViewer and RegisterForm.

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
  - `BlastRadiusBar` requires a `label`, the accessible name of its
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

- 6ac7b30: Breaking changes:
  - `Toolbar` keeps only `left`, `center`, `right` and `className`. The
    built-in search and filter props (`searchPlaceholder`, `searchValue`,
    `onSearchChange`, `filters`, `onFilterRemove`, `onClearFilters`) and the
    deprecated `action` are gone, and so is the `FilterChip` type. Put a
    `SearchInput` and removable `Chip`s in `left`, and actions in `right`.
  - `Markdown variant="document"` and `MdxDocument` share one stylesheet and
    one set of classes, `aegis-document` and `aegis-document__*`, in the
    article type roles. The `aegis-markdown--document` and `aegis-mdx*`
    classes no longer exist. A host override of a document element receives
    the element's document class in `className` and should pass it on.
  - Durations read the same everywhere: TraceTree, TraceSpanInspector,
    TimelineChart's hover guide and tooltip, TimeDisplay's duration,
    TrajectoryStep and TrajectoryTimeline all use `formatDuration`, e.g.
    `400 ns`, `500 µs`, `12.3 ms`, `1.50 s`, `2 min 3 s`, `1 h 5 min`. Less
    than a nanosecond either side of zero reads `<1 ns`, and a negative
    duration keeps its sign.
  - `TimelineChart`'s axis labels every tick in one unit picked from the
    range, e.g. `0 ms` to `750 ms` or `0 min` to `10 min`, and picks its
    ticks by the room their labels take. It measures each label in the
    axis's own font and keeps the densest 1, 2 or 5 × 10ⁿ step, at most six
    ticks, whose labels stay inside the track at least `--space-2` apart; a
    last label with no room after its tick sits before it. It picks again
    when the track, the range or the font changes, before the next paint, so
    no frame shows the old ticks at a new width. It always draws at least
    two ticks and never one past the end of the range: when no whole step
    fits, it shows `0` and the largest round value that fits.
  - `UploadQueue`'s ETA reads in whole seconds, rounded up: `ETA 4 s`,
    `ETA 2 min 5 s`.
  - `TimelineChart` rows are buttons only when `onSelect` is set; without it
    they are not focusable and have no hover state. The selected row carries
    `aria-current`.
  - Numbers, durations and times are set in the numeric face with tabular
    figures instead of the mono face: `TimeDisplay`, `MetricCard`'s value,
    `TraceTree`'s durations, `TraceSpanInspector`'s numbers, start and
    duration, `TrajectoryStep`'s number, duration and time,
    `TrajectoryTimeline`'s total and `ObjectBrowser`'s selection count. These
    no longer render a `MonoValue`. `MonoValue` is documented as the face for
    ids, paths and code only. `MetricCard`'s value takes the new
    `--type-number-compact-*` role (`18px` / `24px`, medium).
  - `PageHeader`'s description is sentence case in the small type role
    (`12px`, no extra tracking) instead of uppercase micro type. The
    `--page-header-description-transform` token is gone, and
    `--page-header-description-size` and `--page-header-description-tracking`
    default to the small role.
  - `Panel` shows its header when `title`, `description` or `extra` has
    content. `0` counts as content; `undefined`, `null`, `true`, `false` and
    `''` do not. Before, a falsy `title` hid `extra` and `description`.
  - `Select`'s `label` is a `<label>` for the select, and `aria-label` no
    longer falls back to a string `label`. Pass `ariaLabel` only when there
    is no visible caption.
  - `ObjectInspector` draws its tab row with `Tabs` and follows `tabs` and
    `defaultTabId`: it opens on `defaultTabId` again whenever that changes,
    and a tab the reader picks holds until then.
  - `TraceTree` renders its rows inside a `role="tree"` element and draws one
    resize handle for the name column instead of one per row.
  - `ShareLinkDialog` is the body of a dialog: it no longer draws its own
    card or takes `onClose`. Place it in a `Dialog`, whose close control is
    the only one.

  Additions:
  - `formatDuration(ms)` is exported from the package root.
  - `Tabs` items take `disabled` and `hint`. A disabled tab is
    `aria-disabled`: the arrow keys, Home and End still focus it, but it is
    never selected. The hint is a themed tooltip that opens on hover and on
    focus, and it is the tab's accessible description. The list's one tab
    stop follows focus, so Tab and Shift+Tab leave the list from a disabled
    tab too, and it returns to the selected tab when focus leaves. It follows
    the focused tab by key, so it stays on that tab when tabs are added or
    removed before it, and falls back to the selected tab when that tab is
    removed. `Tabs`
    takes `ariaLabel`, and `panelId` names the panel a `listOnly` tab row
    controls.
  - `TimeDisplay`'s `value` accepts `null` and `undefined`. An empty or
    unreadable value shows `—`, read out as the locale's `noValue`, instead of
    `NaN`. In `duration` mode the tooltip gives the exact milliseconds
    instead of reading the duration as a date.
  - The `--type-number-compact-*` type role, for figures in compact cards.
  - `TraceTree` takes `ariaLabel` for the tree.
  - `StatusDot` takes `tone="caution"`, filled with `--ink-warn` like Chip's
    `caution`, for what needs attention but has not failed.

  Fixes:
  - `ObjectInspector` no longer opens with an empty body when its tabs arrive
    after mount, as in the blob browser.
  - `TraceTree` nests spans at the right depth whatever order they arrive in,
    and cuts a parent cycle at one span instead of dropping it. It is an ARIA
    tree with one tab stop: Up and Down move, Right expands and then enters,
    Left collapses and then leaves, Home and End jump, Enter and Space select.
    The caret toggles a row without selecting it. Only the selected row
    carries `aria-selected`.
  - `TraceTree` rows share one column template, so every bar is drawn on the
    same scale however wide a row's duration is, and durations line up on the
    right. The name column's resize handle sits on the same column edge.
  - A table in a `Markdown` document or `MdxDocument` breaks its cells only
    between words; a table wider than the column scrolls sideways.
  - The `Tabs` indicator leaves the selected tab when that tab becomes
    disabled, and returns when it is enabled again.
  - `TimelineChart`'s hover guide measures over the track only, so it reads
    `0` at the track's start, and it hides over the label column.
  - `QueryAutocomplete` reopens its list on typing, focus or ArrowDown after
    Escape or blur, and is a combobox with `aria-expanded`, `aria-controls`
    and `aria-activedescendant`.
  - `ShareLinkDialog` drops a link generated for options the reader has since
    changed. Its expiry presets are a labelled group of toggle buttons with
    `aria-pressed`.
  - `TraceSpanInspector` says why an attribute or the raw span cannot be shown
    as JSON instead of showing `{}`.
  - `SparkLine` draws a series that does not vary, a single point included,
    as a level line through the middle. A one-sample `MetricCard` chart is no
    longer blank, and a flat series no longer runs along the bottom edge,
    where half its stroke was clipped.
  - `ProjectSelector`'s trigger content is phrasing content, valid inside the
    dropdown's button.
  - `ScrollStory` tracks the current step with `useSectionSpy`. A stacked
    `ScrollStory`, which spies on no sections, no longer looks up an empty
    id, which Firefox warned about.
  - The rolling digits of `StatBlock`, `MetricCard` and `HeadlineStat` no
    longer make the scroll container around them scrollable: each digit
    column is cropped with `overflow: clip`, which keeps it on the baseline.

- ec40a57: Breaking:
  - Remove `BucketCard`. It mirrored the blob API and had one consumer, so the
    blob sub-app now composes its own card from `Panel`, `MonoValue`, `Chip`
    and `StatBlock`. Hosts that rendered `BucketCard` should do the same.

  Additions:
  - `TableOfContents` items take `level: 4`, indented one step past level 3, so
    a page can list h1 to h4.
  - `TableOfContents` tracks sections that mount after it, or are re-created
    later, such as the headings of a lazily loaded `Markdown` body.
  - `FileTree` files take a `label` shown in place of the file name, for
    example a note's name without `.md`; the row's title keeps the path.
  - `FileTree` takes `fileHref` and `fileTarget`. With `fileHref`, each file
    row is a link to the URL it returns, so opening in a new tab or copying
    the address works on it, and Enter follows the link.

- da19db5: Let a test or a screen reader read tables, regions, graphs and errors by
  role and name:
  - DataTable: `ariaLabel` names the table. Header cells carry
    `scope="col"`, so they are column headers. A selected row of a
    `selectable` table is `aria-selected`. The row-click chevron column and
    the empty state are no longer read as a column or a row, and `loading`
    marks the table `aria-busy` as `stale` does.
  - Panel: a panel with a `title` is a `region` named by its title.
  - ErrorState is an `alert`.
  - ServiceMap: each edge is a `group` named
    `<source label> → <target label>`. The node that `selectedNodeId` names
    is `aria-current`. A group box carries no role or name, since its nodes
    are not inside it in the DOM.
  - CommitGraph: `columns` draws the commits as a table, the graph in the
    first column and then one column per entry, each row's cells from
    `CommitGraphCommit.cells`. A cell is one line, cut to the row's height.
    A `grow` column takes the width left and cuts its cells off; hovering a
    cut cell shows it whole. With `onSelectedIdsChange` the checkbox sits in
    the first column, named by that cell, and a selected row is
    `aria-selected`. `CommitGraphCommit.title` is now optional, since a
    table does not show it. In a list and in a table, a row's lane and
    merge are its accessible description instead of hidden text in the row.

  The gallery has a specimen for each.

- 35ee09b: Let pages link from tabs and tree rows, show times in UTC, and mark the
  current row of a table:
  - Tabs: `TabItem.to` makes a tab a link, rendered by the new
    `linkComponent` prop. With links, Tabs is a `nav` of links that look
    like tabs, each one a tab stop, and the one `activeKey` names is
    `aria-current="page"`.
  - TraceTree: `TraceSpan.to` makes the span's name a link, rendered by the
    new `linkComponent` prop. The row stays the tree's tab stop: the link
    has `tabIndex={-1}`, and Enter on the row follows it. Space still
    selects.
  - `LinkComponent` takes an optional `tabIndex`; the default `<a>` and the
    shell's adapter pass it on to the anchor. Adapters of your own should
    pass it on too.
  - TimeDisplay: `mode="utc"` writes `YYYY-MM-DD HH:MM:SS` in UTC, the same
    text in every time zone and on every day. `mode="hms"` writes an elapsed
    time as `H:MM:SS` in whole seconds, the hours neither padded nor capped
    (`0:00:05`, `27:03:09`), with the exact milliseconds as its tooltip.
  - DataTable: the rows `selectedKeys` names are `aria-selected` and drawn
    selected, with or without `selectable`; without it there is no checkbox
    column. A selected row now has the `--bg-muted` fill.

  The gallery has a specimen for each.

- b1f1a9c: Add the views a spec-to-code pipeline needs to show its histories and task
  graphs:
  - New `CommitGraph`: commits newest first, each drawn on its track with
    edges to its parents, git-log style. A commit with two or more parents
    drawn is a merge and draws as a ring, hollow on a selected row too;
    `refs` put branch names before the title. `lanes` split the graph into
    side-by-side histories (requirement commits, runs, trunk commits) and
    `links` draw a dashed edge from a commit to one it relates to in another
    lane. With lanes, a parent in another lane is not drawn, and a commit
    whose `lane` names no lane is drawn in the first. With
    `onSelectedIdsChange` each row has a checkbox named by the commit's
    title, and `maxSelected` keeps the most recent picks. Each row tells
    assistive technology its lane and whether it is a merge. A title stays on
    one line; hovering a cut-off title shows it whole. At 640 px and below
    the lanes narrow to 56 px and cut a long lane label off, so the graph
    does not scroll sideways.
  - ServiceMap: `groups` box nodes by a label, and the groups follow one
    another along `direction` in the order given, each laid out on its own.
    A group box sits under the edges and lets clicks through to them, is a
    named `group` for assistive technology, cuts a long label off, and is an
    outline in the minimap; a group may share an id with a node.
    `focusNodeId` opens the map at actual size on one node instead of
    fitting every node, fitted to the node and its direct neighbours when
    they fit and centred on the node alone when they do not; an id that is
    not on the map is ignored. `fillViewport` makes the map as tall as the
    viewport below the shell header and breadcrumb bar
    (`--service-map-viewport-height`) above 768 px; `minimap` shows or hides
    the minimap; an `active` status marks a node that is running with a
    pulsing dot (edges take every status but `active`); `ariaLabel` names
    the map.
  - ServiceMap fits the view once its nodes are measured, and again when its
    shape (direction, node ids, edge endpoints, groups, node sizes) or
    `focusNodeId` changes. A new status, sublabel, badge or selection keeps
    the user's pan and zoom.
  - ServiceMap nodes widen with their label up to 320 px and then wrap it,
    instead of cutting it off at 180 px. The minimap is shown by default only
    when the map is fitted whole, and the fit keeps its strip clear, so it no
    longer covers nodes; it is not shown at 768 px and below. A fit never
    zooms in past actual size, and the map can zoom out to 10 %, so a large
    map still fits whole.
  - ServiceMap without `height` now fills its container and is at least
    `--service-map-min-height` tall. Before, the pane resolved to zero height
    inside a container whose height came from its content.
  - Chip: `inverted` draws the chip on a `--bg-inverted` surface, such as a
    selected row: `default`, `ink` and `ghost` take the inverted ink, the
    tinted tones keep theirs.
  - Checkbox: `ariaLabelledBy` names the checkbox by another element, e.g.
    its row's title.
  - TraceTree: `TraceSpan.note` puts a note at the end of a row and makes it
    the row's accessible description, not part of its name; give a Chip in
    the note `inverted` while the span is selected. `TraceSpan.muted` draws
    the row in muted ink; `TraceSpan.ariaLabel` overrides the row's
    accessible name.
  - FileTree: `directoryNote` replaces the file count of a directory with any
    note, computed from the files under it. Each row's note is now its
    accessible description.
  - MetadataList: `wrap` wraps long values and keeps their line breaks
    instead of truncating them.
  - MonoValue: `wrap` breaks the value at any character, so a long digest
    fits a narrow column.
  - New token `--breadcrumb-bar-height`, the height of the shell's
    breadcrumb bar, which now sets its line height to `--type-body-line`.
  - New locale string `mergeCommit`. A host that builds its own
    `AegisStrings` adds it.

  The gallery has a specimen for each.

- Updated dependencies [ba74aca]
- Updated dependencies [3aed0c8]
- Updated dependencies [8439df6]
- Updated dependencies [ce19841]
- Updated dependencies [c544362]
- Updated dependencies [6ac7b30]
- Updated dependencies [ec40a57]
- Updated dependencies [da19db5]
- Updated dependencies [35ee09b]
- Updated dependencies [b1f1a9c]
  - @lincyaw/aegis-ui@0.10.0

## 0.3.7

### Patch Changes

- Updated dependencies [624e26e]
  - @lincyaw/aegis-ui@0.9.1

## 0.3.6

### Patch Changes

- Updated dependencies [82f103d]
- Updated dependencies [c0e86a0]
  - @lincyaw/aegis-ui@0.9.0

## 0.3.5

### Patch Changes

- Updated dependencies [fba96c0]
- Updated dependencies [0377798]
- Updated dependencies [12e657d]
- Updated dependencies [d29dd58]
- Updated dependencies [12e657d]
  - @lincyaw/aegis-ui@0.8.0

## 0.3.4

### Patch Changes

- Updated dependencies [4d08365]
- Updated dependencies [688a930]
- Updated dependencies [987c87e]
- Updated dependencies [b246f83]
- Updated dependencies [b0d65a6]
- Updated dependencies [56ec3cd]
- Updated dependencies [b007da4]
  - @lincyaw/aegis-ui@0.7.0

## 0.3.3

### Patch Changes

- Updated dependencies [4597728]
- Updated dependencies [44b8651]
- Updated dependencies [6517e6e]
- Updated dependencies [a9d44d9]
- Updated dependencies [ecd7441]
- Updated dependencies [2cad7c9]
- Updated dependencies [5092695]
- Updated dependencies [f6c6836]
- Updated dependencies [9ca8d52]
- Updated dependencies [d062438]
- Updated dependencies [7c70dc0]
- Updated dependencies [84721ff]
- Updated dependencies [1721e7e]
  - @lincyaw/aegis-ui@0.6.0

## 0.3.2

### Patch Changes

- Updated dependencies
  - @lincyaw/aegis-ui@0.5.0

## 0.3.1

### Patch Changes

- Updated dependencies
  - @lincyaw/aegis-ui@0.4.0
