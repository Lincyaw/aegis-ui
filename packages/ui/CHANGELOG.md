# @lincyaw/aegis-ui

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
