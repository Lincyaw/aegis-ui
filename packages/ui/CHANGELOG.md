# @lincyaw/aegis-ui

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
