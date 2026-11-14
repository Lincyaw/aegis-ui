---
'@lincyaw/aegis-ui': minor
---

Reveal a `TraceTree`'s selected row under collapsed rows, let a
`Timeline`'s items be selected, and export `RollingValue`.

Changed:

- `TraceTree` reveals the row of `selectedId`: when the tree mounts, and
  each time `selectedId` changes, the rows it hangs under expand before it
  is drawn. With `defaultCollapsedDepth` a large tree opens with only the
  path to the selected row expanded, and a selection made outside the
  tree, such as by a link, opens the path to its row. Rows the viewer
  collapses afterwards stay collapsed.

Added:

- `Timeline` takes `selectedId`, `onSelect`, `scrollable` and `ariaLabel`.
  With `onSelect` the list is a listbox whose items are options: one tab
  stop, ↑ ↓ Home End move between them, Enter or Space or a click selects,
  and the selected item is inverted, its title, timestamp, meta and dot
  included. `scrollable` bounds the list to the new
  `--timeline-scroll-max-height` token and scrolls it; the list keeps the
  selected item in view when it mounts and when `selectedId` changes,
  scrolling only itself, never the page.
- `RollingValue` and its `RollingValueProps` are exported: a number or
  numeric string whose digits roll to a new value, right column first, as
  in `StatBlock`, `MetricCard` and `HeadlineStat`.
