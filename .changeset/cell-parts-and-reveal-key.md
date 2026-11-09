---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': minor
---

Let a `CommitGraph` table cell be given as parts, so its links keep their
width while its text gives way, and scroll the page to a `DetailBeside`'s
row only when the viewer asks for it.

Breaking:

- `DetailBeside` requires `revealKey: string | null`, so every existing
  `<DetailBeside>` stops type-checking until it passes one. Pass the
  selection as the page's address names it, such as the id read from the
  URL; the selected id where the selection is the page's local state, set
  only by the viewer; and `null` where nothing names the selection and the
  list shows a default.

Added:

- `CommitGraphCommit.cells` takes, besides a node, `{ parts }`: the
  parts of a cell on one line, in order, a small gap apart. In a growing
  column only the parts marked `cut` give way, cut off with an ellipsis;
  every other part, such as a link, keeps its whole width, and the column
  is at least as wide as the parts its cells keep, past which the table
  scrolls sideways. In a column that does not grow, every part keeps its
  width. Hovering a cell whose cut part is cut shows the cell whole.
  `CommitGraphPartsCell` (a cell given as parts) and
  `CommitGraphCellPart` (one of its parts) are exported.

Changed:

- `DetailBeside` takes `revealKey`: the selection as the page's address
  names it, or null where it names none and the list shows a default. The
  page scrolls to the selected row on the first placement after mount,
  when `revealKey` changes and when the viewer clicks the selected row.
  Any other placement, such as new data that moves a default selection or
  the rows above the selected one, levels the detail with its row by the
  same rule and leaves the page where it is; a host that renders a new
  list or detail also ends the following of the row's growth. For that,
  the host renders the list and the detail anew from the data it passes
  them: a list or detail that fetches its own data and redraws without the
  host rendering leaves the page following the row, and its next change of
  size scrolls. A host that wants the page to stay put when rows arrive
  above the view sets `overflow-anchor: none` on its scroller, since the
  browser's scroll anchoring moves it otherwise.

The gallery shows the version map with its cells as parts, a selectable
table given as parts, and a `DetailBeside` whose data refreshes and moves
its default selection, with the frame's scroll position shown without
rendering the specimen again.
