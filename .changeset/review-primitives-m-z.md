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
  TimelineChart (axis, hover guide and tooltip), TimeDisplay's duration,
  TrajectoryStep, TrajectoryTimeline and UploadQueue's ETA all use
  `formatDuration`, e.g. `400 ns`, `500 µs`, `12.3 ms`, `1.50 s`,
  `2 min 3 s`, `1 h 5 min`.
- `TimelineChart` rows are buttons only when `onSelect` is set; without it
  they are not focusable and have no hover state.
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
- `Tabs` items take `disabled` and `hint`; the arrow keys, Home and End pass
  over disabled tabs. `Tabs` takes `ariaLabel`, and `panelId` names the
  panel a `listOnly` tab row controls.
- `TraceTree` takes `ariaLabel` for the tree.

Fixes:

- `ObjectInspector` no longer opens with an empty body when its tabs arrive
  after mount, as in the blob browser.
- `TraceTree` nests spans at the right depth whatever order they arrive in,
  and cuts a parent cycle at one span instead of dropping it. It is an ARIA
  tree with one tab stop: Up and Down move, Right expands and then enters,
  Left collapses and then leaves, Home and End jump, Enter and Space select.
  The caret toggles a row without selecting it.
- `TimelineChart`'s hover guide measures over the track only, so it reads
  `0` at the track's start, and it hides over the label column.
- `QueryAutocomplete` reopens its list on typing, focus or ArrowDown after
  Escape or blur, and is a combobox with `aria-expanded`, `aria-controls`
  and `aria-activedescendant`.
- `ShareLinkDialog` drops a link generated for options the reader has since
  changed.
- `TraceSpanInspector` says why an attribute or the raw span cannot be shown
  as JSON instead of showing `{}`.
- `SparkLine` draws a level line for a single point, so a one-sample
  `MetricCard` chart is no longer blank.
- `ScrollStory` tracks the current step with `useSectionSpy`.
