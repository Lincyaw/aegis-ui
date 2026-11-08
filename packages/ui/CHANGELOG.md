# @lincyaw/aegis-ui

## 0.10.0

### Minor Changes

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

- ce19841: Add four primitives:
  - `Steps` — a numbered step indicator for wizards. The current step inverts, earlier steps show a check, and an optional `onStepClick` turns every other step into a button; an item's `disabled` keeps it from being clicked. Each step's accessible name carries its number and its state (completed, current step, not yet available).
  - `ChoiceCardGroup` — a single choice drawn as a grid of cards (`ChoiceCardOption`: title, description, meta, disabled). Each card is a native radio, so arrow keys move the choice; the chosen card inverts and the others lift on hover.
  - `NumberField` — a text field for one number. `integer` refuses decimals, `min` / `max` / `step` drive the arrow and PageUp / PageDown keys, `unit` shows inside the field, and text that is not a number of the right kind is reported under the field while the host receives `undefined`.
  - `Slider` — one number along a range on a native range input, with the formatted value shown above the track and given as `aria-valuetext`.

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

## 0.9.4

### Patch Changes

- a721b8d: Keep nested content out of keyboard navigation and the accessibility tree while an ancestor Collapse panel is closed.

## 0.9.3

### Patch Changes

- 63b0451: Distinguish same-colour chart series with solid, dashed and dotted lines and matching SeriesLabel swatches.

## 0.9.2

### Patch Changes

- 83e51da: Allow LineChart hosts to use a separate legend by disabling end labels.

## 0.9.1

### Patch Changes

- 624e26e: SiteFooter: the outlined wordmark no longer shows the seams where a variable font's overlapping contours cross, such as the bar of an H across its stems.

## 0.9.0

### Minor Changes

- c0e86a0: Primitives for a public results site.
  - New: `SiteAnchorNav`, `SiteSectionHeader`, `HeadlineStat`, `SeriesLabel`, `KeyMomentCard`, `ThoughtCard`, `AgentHud`, `ResultMatrix`, `Heatmap`, `ColumnChart`, `DotRangeChart` and `LineChart`.
  - `RankBar`: `interval` on an item and `size='sm'`.
  - `StackedBar`: `normalize`, `onSegmentSelect` and `isSegmentSelectable`.
  - `ParetoChart`: `xScale='log'`, `xDomain`, `yDomain`, `xTicks`, `yTicks`, `labels='all'`, `fadeDominated`, `highlightKeys`, `maxHeight` and `frontProgress`. Scroll progress now traces the frontier instead of fading it in.
  - `ReplayStepStrip`: `size='sm'`, `playhead` and a per-step `weight`. The row of key moments is left out when there are none.
  - `ChartLegend`: `hollow` on an item.
  - `ScrollStory`: `panelSide='start'` pins the panel on the leading side.
  - Exports: `useMediaQuery` and `stageProgress`.
  - Tokens: `--series-<vendor>` for model vendors, `--replay-<kind>` for replay steps and the `--type-number-display-*` role.

### Patch Changes

- 82f103d: RankBar: at 768 px and below, each row puts the bar on a line of its own under the label, value and action, so a long label or a row link no longer squeezes the bar.

## 0.8.0

### Minor Changes

- fba96c0: The chart primitives share one foundation:
  - `ChartColor` colours a series with a palette colour (`seq`, `cat-1`…`cat-6`, `unknown`) or a host token such as `var(--series-openai)`, so a vendor keeps one colour on every chart. `StackedBarSeries.color`, `ParetoPoint.color` and `ParetoLegendItem.color` take it, and `RankBarItem` gains `color`. Breaking: `StackedBarColor` is gone (use `ChartColor`), and `ParetoChart` colours no longer accept arbitrary CSS, only palette names or `var(--…)` tokens.
  - `ChartLegend` is the legend `StackedBar` and `ParetoChart` draw, with `square` or `dot` swatches, for a host's own charts too.
  - `RankBar`, `StackedBar` and `ParetoChart` take `progress` (0–1, e.g. from `useScrollProgress`): bars draw in from the left row by row and Pareto points fade in from left to right, following the scroll both ways instead of playing once.
  - Breaking: `RankBar`'s scale defaults to the largest value, as documented (it treated anything up to 1 as out of 1); pass `max={1}` for a share or a 0–1 score.
  - `TimelineChart` ticks sit at round offsets from the start (0, 0.5 s, 1 s) instead of round absolute times, cannot stall on nanosecond timestamps, and span kinds take the data palette.
  - Chart numbers (`RankBar` values and ticks, `ParetoChart` ticks, `TimelineChart` labels) use the tabular UI face instead of the mono face, which is for ids and code; Pareto points fade in rather than scaling.
  - `chartColorValue`, `zeroAnchoredDomain`, `niceTicks` and `staggeredProgress` are exported for host charts.

- 0377798: `DataTable` sorts. A column with `sortable` turns its header into a sort control with `aria-sort`; with `sortValue` the table orders the rows itself (a `null` value last in either direction, ties keeping their order), and without it the host orders `data`, for instance from a URL parameter, and the header only shows the state. The table takes `sort` (controlled), `defaultSort` and `onSortChange`; a first click sorts numeric columns high first unless the column sets `firstSortDirection`. Row indices passed to `render` and the other callbacks count in the sorted order.
- 12e657d: Breaking: one span model and one trajectory model.
  - `TimelineChart` takes the `TraceSpan[]` that `TraceTree` and `TraceSpanInspector` take, in milliseconds: a span draws a bar when it has `startMs` and `durationMs`, and its depth follows `parentId`. Its props become `minMs` / `maxMs` and `onSelect` (was `minNs` / `maxNs` and `onSpanClick`), and `TimelineSpan` is gone. `TraceSpan.kind` is a string, which labels the tree chip and, without `color`, colours the timeline bar; `TraceSpan` gains `color` (a `ChartColor`, so a translated kind can keep one colour) and `badge` for the bar.
  - `SessionRunTrajectoryView`, `SessionRunOutputView` and their `SessionRun*` types leave the library: they rendered raw message blocks for one console app, beside the library's trajectory model (`TrajectoryStepData`, `ToolCallData`). The console keeps them with its trajectories app; their locale strings are gone too.

- d29dd58: Add the replay parts, for replaying an agent run or a game step by step:
  - `useReplayPlayback` holds the current step and plays a replay one step at a time (each step lasting `stepDurationMs` at speed 1, divided by `speed`; a speed change rescales what is left of the step), stopping at the last step and pausing while the page is hidden; `autoPlay` stays off under reduced motion. It returns `index`, `playing`, `seek`, `previous`, `next`, `play`, `pause`, `toggle`, and `hold` / `release` to suspend advancing while the reader drags, controlled or uncontrolled.
  - `ReplayScrubber` is the position: a slider from the first step to the last with event markers above it (`ChartColor` dots, whose labels the slider's value text reads at their step), the first, current and last step labels below, dragging (`onScrubStart` / `onScrubEnd`), and arrow / Page Up / Page Down / Home / End keys.
  - `ReplayTransport` holds step back, play or pause and step forward, the position text, an optional speed switch (a radio group) and an `extra` slot for further controls such as a players' view switch.
  - `ReplayStepStrip` draws every step (`ReplayStepStripItem`) as a bar in its kind's colour (taller for `emphasis` steps), numbers the key moments above it and ticks steps below; the gap between bars narrows for long runs, so hundreds of steps still draw. With `onSelect`, bars select their step and arrow keys move between them with one tab stop; without it the steps are a list with their labels.

  New tokens `--replay-scrubber-track`, `--replay-scrubber-thumb`, `--replay-transport-button`, `--replay-transport-play`, `--replay-step-strip-bar`, `--replay-step-strip-bar-emphasis` and `--replay-step-strip-gap`, and locale strings for the controls.

- 12e657d: Fixes to the public-site frame and the chart foundation:
  - `--site-column` is the site's content column, used by `SiteNav`, `SiteSection` and `SiteFooter`. Its gutter is 120 from a 1280 window up, then shrinks so the column holds 1040 and narrows without a jump, and is `--space-4` at 768 and narrower. Breaking: `--site-gutter` is now that computed gutter and `--site-gutter-mobile` is gone; set `--site-gutter-wide` or `--site-content-width` to change the column.
  - `SiteLayout` sets `--header-height` and `--scroll-story-sticky-top` from the site nav, so article headings, anchors and a pinned `ScrollStory` panel stop below the floating nav instead of under it.
  - The `SiteNav` menu closes on any click outside it and when `activeKey` changes, and its button rises on hover like the shell's.
  - The footer's mobile link columns wrap by `--site-footer-column-min` instead of a fixed three; `--site-wordmark-size` is documented as tuned for an eleven-letter wordmark.
  - `RankBar` and `StackedBar` draw by scroll with a clipped slide instead of `scaleX`, so the leading edge keeps its rounded corners. Pareto points drop their opacity transition while scroll-driven.
  - `niceTicks` keeps the top tick when the end is a multiple of the step (0.6 by 0.2), rounds ticks to the step's decimals and never returns `-0`.
  - `AegisShell` and `SiteLayout` share one skip link; the shell's skip link class is now `aegis-skip-link`.

## 0.7.0

### Minor Changes

- 4d08365: Breaking: the agent code is split into layers, and the connections an outside agent uses move to a separate entry, so the main entry opens none.
  - The AgentM chat channel and the MCP bridge client move to `@lincyaw/aegis-ui/transports`: import `AgentmChannelProvider`, `AgentmChannelClient`, `AGENTM_WIRE_VERSION`, their types and the new `connectAegisBridge` / `AegisBridgeConfig` from there.
  - Renames: `AgentProvider` → `AgentChatProvider`, `useAgent` → `useAgentChat`, `AgentContextValue` → `AgentChatValue`, `AegisAgentProvider` → `AegisRuntimeProvider`.
  - `AegisRuntimeProvider` no longer connects to the MCP bridge or reads `window.__AEGIS_BRIDGE__`, and drops `bridgeUrl`, `bridgeAuthToken` and `bridgeAutoConnect`. To keep the bridge, create the runtime yourself and pass it to the shell:

    ```ts
    const agentRuntime = createAegisRuntime();
    connectAegisBridge(agentRuntime, { url, authToken });
    <AegisShell agentRuntime={agentRuntime} … />
    ```

  - `AegisRuntime` gains a public `setSelection(refs)` (it was `_setSelection`); the other `_`-prefixed methods are internal and no longer in the published types.

- 688a930: Breaking: `compileLuceneToSql` and its `CompileOptions`, `CompileResult` and `FieldMapping` types leave the library, which no longer depends on `@hyperdx/lucene`. Turning a search box into ClickHouse SQL is the host's business; the console keeps the compiler with the trajectories app. `tokenizeAtCursor` and `replaceTokenAtCursor`, which `QueryAutocomplete` uses, stay.

  `FilePreview` reads only the first 256 KB of a text file and cancels the rest of the download, instead of downloading the whole file before cutting it.

- 987c87e: The build emits one file per source module (`preserveModules`), so a bundler keeps only the primitives a host imports: `import { Panel, PageWrapper }` now costs about 3 KB minified instead of 1.1 MB, and CodeMirror, the diff viewer and the flow-graph library arrive only with the primitives that use them. Entry points and `style.css` are unchanged.
- b246f83: Add `ScrollStory`, which tells a story in steps: the steps scroll as ordinary text while a panel beside them stays pinned and shows the current step's visual, and at 768px and narrower each visual follows its own step. Add `useScrollProgress`, which reports how far an element has travelled through the view as a number from 0 to 1 over a CSS `animation-range` style range (`entry`, `exit`, `cover` or `contain`), for motion tied to the scroll position such as a chart that draws as it comes into view; it stays at 1 under prefers-reduced-motion. New tokens `--scroll-story-sticky-top`, `--scroll-story-view-height` and `--scroll-story-step-min-height` set where the panel pins, the height of the view it pins in (set it to the container's height when passing `scrollContainer`) and how tall each step is.
- b0d65a6: The library renders on the server, so a site can prerender its pages:
  - `useMediaQuery` and `usePageHidden` read as not matching / visible on the server, and `StatBlock` with `animateValue` renders its final value first and starts counting after mount, so prerendered HTML carries the real number.
  - Primitives use layout effects only in the browser, so a server render logs no `useLayoutEffect` warnings from the library.
  - `ThemeProvider` renders with `defaultPreference` on the server and while hydrating, then applies the stored choice; it follows other tabs' changes. New `themeInitScript(defaultPreference?)` returns an inline `<head>` script that sets `data-theme` before the first paint, so a prerendered page opens in the visitor's theme.

- 56ec3cd: `ToolCallData` and `AgentToolCallRecord` drop `isError`: `status` alone says how a call ended, and `AgentmChannelProvider` turns a call the gateway reports as `ok` with `is_error` into `status: 'error'`, so `ToolCallCard` no longer shows a failed call as ok. Pass `status: 'error'` where you passed `isError: true`.

  The shell's header icon buttons, `ThemeToggle`, the `ChatComposer` send button and `SavedQueryBar` chips rise on hover and settle back when pressed, like `Button`, instead of shrinking. Agent surfaces measure their element when the runtime takes a snapshot rather than on every scroll, so primitives without a `surface` no longer re-render while the page scrolls.

- b007da4: Add the public site's frame, for sites that are not a console:
  - `SiteLayout` holds a skip link, the nav, the page and the footer, with no sidebar and no padding of its own.
  - `SiteNav` lies flat at the top of the page and floats as a glass bar once the page scrolls (`variant` pins either look); at 768px and narrower its links fold into a menu.
  - `SiteSection` is a band whose background runs the full width and whose content sits in the site's content column; plain neighbours are divided by a hairline, `tone="tint"` fills the band.
  - `SiteFooter` shows the brand, link columns, a note and a large outlined wordmark.

  New tokens `--site-content-width`, `--site-gutter`, `--site-gutter-mobile`, `--site-nav-height`, `--site-nav-height-mobile`, `--site-nav-float-offset`, `--site-section-padding`, `--site-section-padding-mobile`, `--site-wordmark-size`, `--site-wordmark-tracking`, `--space-16` and `--size-control-lg`. `LinkComponent` gains an optional `aria-current`, which `DefaultLink` passes on; pass it to your router link in your adapter too.

## 0.6.0

### Minor Changes

- 4597728: Add the knobs the CGFS display pages had worked around, plus `IdentityCell` and `ButtonLink`. Every default keeps the current rendering.
  - New primitives: `IdentityCell` (an optional Avatar with `colorSlot`, a name that can be a link through `linkComponent`, and an optional muted mono secondary line, stacked or `inline`; with a name alone it is one line centred on the avatar) and `ButtonLink` (a link with the Button look). Both take the router adapter type `LinkComponent`, which `Breadcrumb` now uses too.
  - `Alert` `icon` replaces the tone dot. `Tabs` `listOnly` drops the tabpanel and `size="sm"` makes the list `--size-control-base` tall. `PageHeader` `titleExtra` sits beside the title, `description` accepts any node, and `--page-header-margin-bottom` sets the space under it.
  - `Breadcrumb` items that are wider than the trail truncate with an ellipsis instead of widening the page.
  - `SearchInput` `block` fills its container; `--search-input-height` and `--select-height` let a host line SearchInput and Select up at `--size-control-base`.
  - `ShareLinkDialog` `url` shows a link that does not expire (no TTL presets, download toggle or countdown) and `description` adds a context line; its built-in text goes through the locale strings (`shareLink*`, `clipboardUnavailable`).
  - `useCopyToClipboard` is exported from the package root.
  - `DataTable` `stickyFirstColumn` keeps the first column (and the selection column) in view, column `cellTone` washes a cell in a tone graded in five steps (`--data-table-cell-tone-step`), and `stale` dims out-of-date rows and marks the table busy.
  - `ParetoChart` `legend` lists series swatches under the plot and `empty` replaces the plot at its minimum height while there are no points.
  - `Timeline` `density="compact"` keeps titles on one line with an ellipsis and tightens the rows.
  - `Chip` size `md` centres its label without vertical padding, so a fixed `--chip-height-md` such as 24 px no longer overflows its content box.
  - `ControlListItem` `description` adds a muted line that inverts with `active`.
  - Tokens `--metric-label-transform` / `--metric-label-tracking` (MetricLabel) and `--stat-block-emphasized-size` (StatBlock `emphasized`).
  - Shell: `AegisShell` `appSwitcher={false}` hides the app launcher and `elevateHeaderOnScroll` gives the sticky header a shadow once the page scrolls.

- 44b8651: Add Checkbox, Select, RankBar, ParetoChart and Dialog primitives for the CGFS display site, extend Chip with success / info / caution tones plus an `md` size, and add the outcome colour tokens (`--accent-success`, `--bg-success-soft`, `--bg-info-soft`) and overlay width tokens those primitives need.
- 6517e6e: Add opt-in knobs, component tokens and primitives for the CGFS display site. Defaults keep the current rendering.
  - New primitives: `ScoreBar` (inline value plus a short bar), `RunPips` (passed/total plus one dot per run, collapsing to a proportional bar), `ColumnLayout` (column template that stacks at 768 px and below) and `PickerField` (a closed-Select look that opens a dialog).
  - Shell: `AegisApp.breadcrumbBar: false` drops the breadcrumb bar for apps that render their own `Breadcrumb`.
  - Component tokens: `--data-table-header-{bg,color,font-size,transform,tracking}`, `--data-table-row-{min-height,separator}`, `--chip-{transform,tracking}`, `--chip-font-size-{sm,md,lg}`, `--chip-height-{sm,md,lg}`, `--page-header-title-{size,size-mobile,weight}`, `--page-header-description-{size,color,transform,tracking}`, `--page-padding-inline(-mobile)`, `--rank-bar-fill`, `--pareto-dominated-opacity`, `--score-bar-*` and `--run-pips-*`.
  - Theme: data-viz colours `--data-seq` and `--data-cat-1` … `--data-cat-6` (light and dark), motion tokens `--motion-enter`, `--motion-exit`, `--motion-chart`, `--motion-enter-offset`, `--size-icon-xl`, and Noto Sans SC in `--font-ui`.
  - `DataTable`: column `numeric`, `renderMobileCard` for card rows at 768 px and below, and `onRowClick` with a hover chevron and Enter activation.
  - `Chip` size `lg`; `MonoValue` `tone`; `Panel` `description`; `Alert` `success` tone and `title`; `StatusDot` `success` tone; `PageHeader` `meta`; `Timeline` `variant="numbered"` with item `marker`; `CodeBlock` `maxHeight`; `Avatar` `colorSlot`; `StatBlock` `animateValue`.
  - `RankBar`: `value: null` renders an em dash over an empty track and the bar track is clickable with `onSelect`. `ParetoChart`: `formatX` / `formatY`, axes anchored at 0, ticks and labels at their CSS size at any width, gridlines, labelled frontier points, dimmed dominated points and an optional per-point `color`.
  - Motion: bars draw in with a per-row stagger and slide between values, chart points stagger in, `Dialog` animates in and out, and `Collapse` expands smoothly with a rotating chevron. `prefers-reduced-motion` turns it all off.

- a9d44d9: Fit the trajectory and trace primitives to recorded agent runs. Every default keeps the current rendering.
  - The text that `TrajectoryTimeline`, `TrajectoryStep`, `ToolCallCard`, `TraceTree`, `TraceSpanInspector`, `ObjectInspector` and `TimelineChart` render on their own goes through the locale strings (`trajectory*`, `toolCall*`, `traceSpan*`, `inspector*`, `expandRow` / `collapseRow`, `resizeNameColumn`, `noAttributes*`, `maximize*` / `restore*` / `closeInspector`, `timelineEmpty*`), with `zhCNStrings` values.
  - `TrajectoryStepData` gains `summary` (the head's preview, defaulting to `action`), `toolCalls` (further calls of the step, each a card after `toolCall`) and `sections` (`TrajectoryStepSection`: labelled texts after the thought and action, as Markdown or, with `format: 'text'`, preformatted and capped at `--trajectory-step-text-max-height`).
  - `TrajectoryTimeline` `header={false}` drops the agent, status and duration header.
  - `TraceSpan.startMs` and `durationMs` are optional: a span without them draws no bar and no duration, siblings that are not all timed keep their given order, and a tree with no timed span shows its labels alone. `TraceSpanInspector` omits the missing timing and takes `detail`, the span's content under the facts in the Overview tab.
  - `TimelineChart` reads its label column from `--timeline-chart-label-width` (280 px, as before) and narrows it to 40% at 768 px and below, so the bars keep most of a phone's width.

- ecd7441: Move the library to the CGFS visual language: cool, very light surfaces, soft near-black ink, one brand blue, glass over a faint ambient wash, pill controls and larger radii.
  - Tokens: the colours follow the Figma variables in both themes and add `--bg-tint`, `--bg-brand-soft`, `--bg-glass`, `--bg-glass-strong`, `--text-faint`, `--border-glass`, `--accent-brand` and the `--ambient-*` blobs. The radius scale is now 4 / 6 / 10 / 20 / 28 / pill. Elevation is `--shadow-rest`, `--shadow-raised` and `--shadow-overlay` with `--glass-blur` and `--backdrop-blur`; `--shadow-panel` and `--shadow-popover` are removed. Focus uses `--focus-ring-*`, `--focus-halo` and `--focus-halo-warning`. Text sizes come from the `--type-<role>-*` roles, and the overview motion tokens (`--motion-lift`, `--motion-reveal*`, `--motion-hero*`, `--motion-slide`, `--carousel-dwell`, `--motion-ambient`) are new.
  - Fonts: `--font-ui` and `--font-numeric` are Hanken Grotesk with PingFang SC / Noto Sans SC for Chinese, and `--font-mono` is Google Sans Code. Import `@fontsource-variable/hanken-grotesk`, `@fontsource-variable/noto-sans-sc` and `@fontsource/google-sans-code` (`400.css`, `500.css`) next to Geist; Inter and JetBrains Mono are no longer used.
  - Removed component tokens, now built into the primitives: `--chip-transform`, `--chip-tracking`, `--chip-font-size-*`, `--chip-height-*`, `--metric-label-transform`, `--metric-label-tracking`, `--search-input-height`, `--select-height`, `--stat-block-emphasized-size`, `--data-table-header-*` and `--data-table-row-separator`. `--data-table-row-min-height` now defaults to 64px.
  - Breaking API changes: `Panel` drops the boolean `inverted` for `variant` (`solid` | `tint` | `brand` | `glass`) and adds `elevation` plus a linked form (`to`, `linkComponent`). `DataTable` draws its own card by default; pass `framed={false}` inside a container that already frames it. `Dialog` renders into `document.body`.
  - Restyled primitives: Button and ButtonLink (pill, hover lift, `tone='glass'`, `icon`, `iconPosition`, styled `aria-pressed`), Chip, Avatar, Tabs (segmented track with a sliding indicator), SearchInput, Select, PickerField, TextField, Checkbox, PanelTitle, Alert, StatBlock, MetricLabel (no uppercase), ScoreBar, RunPips, DataTable (expandable rows through `renderExpanded`), IdentityCell and Timeline.
  - New primitives: `AmbientBackground`, `Reveal`, `Carousel`, `CheckGrid`, `StackedBar`, `TableOfContents` and `FileTree`.

- 2cad7c9: Line breaking, motion curves, focus rings and a skip link follow the design conventions.
  - Headings balance their lines and prose avoids a lone last word: `index.css` sets `text-wrap: balance` on `h1`–`h6` and `text-wrap: pretty` on paragraphs, list items, definitions, quotes and captions, and the title and description classes of `PanelTitle`, `PageHeader`, `Panel`, `Dialog`, `Alert`, `EmptyState` and `ErrorState` do the same.
  - `--motion-fast` and `--motion-base` decelerate into place (`cubic-bezier(0.22, 1, 0.36, 1)`) instead of `ease` and the standard curve, and the agent highlight ring uses the same curve.
  - A pressed button settles back from its hover lift.
  - `InboxPage` rows, `NotificationBell` and its items, `PageSizeSelect` items and `TraceTree` rows show the focus ring on `:focus-visible` instead of a background change alone. Unread inbox rows keep their dot and drop the left bar.
  - `AegisShell` opens with a skip link (`skipToContent` in the locale strings) that moves focus to `main` without a URL fragment.
  - `PanelTitle` drops the `italic` prop and `SavedQueryBar`'s hint is no longer italic; no interface text is italic.

- 5092695: `IdentityCell` gains `wrap`: the name and the secondary text wrap, breaking anywhere, instead of truncating, so a long name never widens the card or list it sits in. Without it the cell truncates as before.
- f6c6836: Add `LocaleProvider` with `enStrings` (default) and `zhCNStrings`, and route the strings that primitives and the shell render on their own through it. `useCopyToClipboard` now uses `copy-to-clipboard`, so copying works on plain-HTTP pages. `joinPath` keeps a query string on app-relative links and the breadcrumb matches sidebar items by path. `SessionRunTrajectoryView` hides empty start-time and token fields. `Select` gains `ariaLabel` and truncates long options; the `DataTable` header checkbox keeps selections made on other pages.
- 9ca8d52: Add `MdxDocument` for long-form documents written in MDX, such as articles and reports, with `mdxTableOfContents` for their headings, the `aegisMdx()` Vite plugin under `@lincyaw/aegis-ui/vite` that compiles them, and the `.mdx` module types under `@lincyaw/aegis-ui/mdx-modules`. `Markdown` block quotes now sit on a tinted block with every corner rounded, in place of a one-sided rule.
- 84721ff: `AegisShell` takes `ambient` (`'page'` or `'hero'`), which draws an `AmbientBackground` across the top of the shell, beneath the glass header and the page content.

### Patch Changes

- d062438: `--page-header-description-line` sets the line height of the `PageHeader` description beside its size, defaulting to the small type role's 20.
- 7c70dc0: `PageHeader` titles use the title type role, 28 / 36 semibold with its tracking, on phones too, in place of 24 medium (18 on phones).
- 1721e7e: `AegisShell` sizes its content column `minmax(0, 1fr)`, so a header row wider than the viewport, such as a long list of app tabs on a phone, scrolls inside the header instead of widening the page.

## 0.5.0

### Packaging

- Dependencies are no longer bundled into `dist`; they are imported from the
  consumer's `node_modules`. The ESM build drops from about 2.2 MB to 0.3 MB,
  and apps that also use CodeMirror or React Flow get a single copy.
- The antd peer range is now `^5.25.0` (popovers use `destroyOnHidden` and
  `classNames.root` instead of the deprecated props).
- The library no longer depends on the `@fontsource-variable/*` packages (it
  never loaded them). Install `@fontsource-variable/geist`,
  `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` and
  import them in the app entry.
- ESM-only dependencies (`hyparquet`, `react-markdown`, `remark-gfm`) load on
  demand, so the CJS build can be `require()`d in Node.

### Shell

- `enableCommandPalette` mounts the command palette (Cmd/Ctrl+K) under a
  `CommandProvider`. Commands in `AegisApp.commands` are registered with the
  app's scope and appear only while that app is active.
- `agentPanel` renders as a right-hand column (a full-screen overlay at 768 px
  and below) under an `AgentProvider`, with a toggle in the header.
- The command scope follows the active app, so scoped commands show up and
  their shortcuts fire.
- At 768 px and below the active app's `header` slot gets its own row, the
  user menu shows initials, and the header no longer overflows the viewport.
  Collapsing the sidebar on desktop no longer removes the mobile drawer.

### Components

- `Markdown`: renders GitHub-flavoured Markdown (tables, task lists,
  strikethrough) by default; accepts `remarkPlugins`, `rehypePlugins`,
  `components` and `urlTransform`; renders fenced code with `CodeBlock`,
  keeping the fence's language label; `variant="document"` adds a heading
  scale and roomier spacing for long-form pages.
- `DataTable`: `pagination` renders a footer with an optional "Rows per page"
  select, a range label and previous/next controls; `kind: 'actions'` columns
  hold right-aligned row actions. Width-less columns no longer collapse on
  narrow screens (the table scrolls instead), and the empty state stays in
  view.
- `DropdownMenu`, `PageSizeSelect`, `EnvironmentSwitcher` and the
  `ChatSessionList` row menu render in a popover, so containers with hidden
  overflow no longer clip them; arrow keys, Escape and focus return work.
  `DropdownMenu` adds `header` and `footerItems`.
- `ProjectSelector`: `footerItems`, a per-option `meta` slot, and a search field
  that is no longer rendered at reduced opacity.
- `CodeBlock`: `language` accepts any string as its label.
- `ErrorState`: `size="compact"` for errors inside panes and sidebars.
- `Tabs`: overflowing tab rows scroll horizontally and keep the active tab in
  view.
- `useResizable`: `keyboardStep`, `constrainWidth`, Home/End and `reset()`.
  `ResizableSidePanel` passes these through and adds `resetOnDoubleClick` and
  `stackOnMobile`.
- `InboxPage` filters with `Tabs` instead of antd `Segmented`.
- `PageWrapper` children fade in with a short stagger (off under
  `prefers-reduced-motion`).

### New exports

- `formatBytes`, and the `ThemeState`, `AgentToolCallRecord`,
  `RegisteredSurface`, `MarkdownProps` and `DataTablePagination` types.

### Fixes

- `TimelineChart` and `TrajectoryTimeline` use their own CSS blocks
  (`aegis-timeline-chart`, `aegis-trajectory-timeline`); they shared
  `aegis-timeline` with `Timeline`, which made Timeline rows overlap. Update
  overrides that targeted the old class names on those two components.
- `ServiceMap`'s minimap draws its nodes, follows the theme and is hidden at
  768 px and below.
- `ThemeProvider` no longer throws when `localStorage` is unavailable.
- `TimeDisplay` honours `refreshMs` in relative mode.
- The `ToolCallCard` running spinner rotates.
- The selected node of an antd `Tree` uses the inverted surface and stays
  readable.
- `PageSizeSelect` generates a unique label id per instance.
- `.page-wrapper` no longer keeps a transform after its entrance, so
  `position: fixed` children are placed against the viewport.
- Several CSS custom properties were used but never defined; `--fs-12` is now
  part of the type scale and the others point at existing tokens.

### Visual changes

- `LoginForm`, `RegisterForm` and `ForgotPasswordForm` submit buttons use the
  `Button` primitive.
- Relative times use one format (`5m ago`); `ChatSessionList` labels are in
  English.
- File sizes use one formatter across the file and bucket components.
- Loading rows in `DataTable`, `EventTable`, `TimelineChart` and
  `ObjectBrowser` use the `Skeleton` primitive.

### Removed

- The `.page-table*` rules from `style.css` (portal-specific styles; use
  `DataTable`).
- Unused tokens: `--fw-light`, `--size-control-lg`, `--bp-sm/md/lg/xl`,
  `--sidebar-width-collapsed`, `--z-fixed`, `--z-tooltip`.

## 0.4.0

### Minor Changes

- Add reusable session trajectory and content inspector components for AgentM session viewers.
