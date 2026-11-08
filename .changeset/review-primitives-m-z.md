---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Breaking changes:

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
  range, e.g. `0 ms` to `750 ms` or `0 min` to `10 min`, and draws fewer
  ticks on a narrow track, one per `72px`, but never fewer than two and
  never one past the end of the range.
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

Additions:

- `formatDuration(ms)` is exported from the package root.
- `Tabs` items take `disabled` and `hint`. A disabled tab is
  `aria-disabled`: the arrow keys, Home and End still focus it, but it is
  never selected. The hint is a themed tooltip that opens on hover and on
  focus, and it is the tab's accessible description. The list's one tab
  stop follows focus, so Tab and Shift+Tab leave the list from a disabled
  tab too, and it returns to the selected tab when focus leaves. `Tabs`
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
- `ScrollStory` tracks the current step with `useSectionSpy`.
