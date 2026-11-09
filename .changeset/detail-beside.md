---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': minor
---

Add `DetailBeside`, which shows the selected item's detail beside its row.

Added:

- `DetailBeside` wraps a `TraceTree`, `FileTree`, `DataTable` or
  `ServiceMap` and takes the selected item's detail. Above 768 px the
  detail stands in a column on the right, level with the selected row.
  When the row is too low for the detail, the detail's bottom meets the
  view's bottom. While the page scrolls, the detail stays in view below
  the header, and it is never taller than the view. At 768 px and below,
  the list draws the detail right after the selected row, with the
  following rows under it. A map draws it over the map, under the node.
  When the page opens with a selection, or the selection changes, the
  page scrolls as little as it takes to show the row and the detail
  whole. The first scroll is instant, later ones are smooth unless
  reduced motion is asked for. `scrollContainer` names the element that
  scrolls, when that is not the viewport.
- `--detail-beside-sticky-top` and `--detail-beside-view-height` set
  where the detail stops under the header and the height of the view it
  stays in.

Changed:

- `TraceTree`, `FileTree`, `DataTable` and `ServiceMap` report their
  selected row (the first selected row of a `DataTable` page, the selected
  node of a map) to an enclosing `DetailBeside`. Outside one, nothing
  changes.
- `ServiceMap` no longer gives its viewport and nodes the 0.01 ms
  transition of the global reduced-motion rule, so a pan takes effect in
  the frame it is made.

The gallery's Layouts section shows `DetailBeside` beside a 150-row
tree, a file tree, a table and a map.
