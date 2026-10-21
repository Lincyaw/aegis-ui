# @lincyaw/aegis-ui

## 0.5.0

### Packaging

- Dependencies are no longer bundled into `dist`; they are imported from the
  consumer's `node_modules`. The ESM build drops from about 2.2 MB to 0.3 MB,
  and apps that also use CodeMirror or React Flow get a single copy.
- The library no longer depends on the `@fontsource-variable/*` packages (it
  never loaded them). Install `@fontsource-variable/geist`,
  `@fontsource-variable/inter` and `@fontsource-variable/jetbrains-mono` and
  import them in the app entry.
- `ParquetViewer` loads `hyparquet` on demand, so the CJS build can be
  `require()`d in Node.

### New exports

- `formatBytes`, and the `ThemeState`, `AgentToolCallRecord` and
  `RegisteredSurface` types.

### Fixes

- `TimelineChart` and `TrajectoryTimeline` now use their own CSS blocks
  (`aegis-timeline-chart`, `aegis-trajectory-timeline`). They previously
  shared `aegis-timeline` with `Timeline`, which made Timeline rows overlap.
  Update any overrides that targeted the old class names on those two
  components.
- `AegisShell` sets the command scope to the active app, so commands with a
  `scope` appear in the palette and respond to shortcuts.
- `ThemeProvider` no longer throws when `localStorage` is unavailable.
- `TimeDisplay` honours `refreshMs` in relative mode.
- The `ToolCallCard` running spinner rotates.

### Visual changes

- `LoginForm`, `RegisterForm` and `ForgotPasswordForm` submit buttons use the
  `Button` primitive.
- Relative times use one format everywhere (`5m ago`), and `ChatSessionList`
  labels are in English.
- File sizes use one formatter across the file and bucket components.
- Loading rows in `DataTable`, `EventTable`, `TimelineChart` and
  `ObjectBrowser` use the `Skeleton` primitive.

## 0.4.0

### Minor Changes

- Add reusable session trajectory and content inspector components for AgentM session viewers.
