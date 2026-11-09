---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': minor
---

Let a `CommitGraph` table cell be given as parts, so its links keep their
width while its text gives way.

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

The gallery's CommitGraph section shows the version map with its cells as
parts, and a selectable table whose first column, and a column that does
not grow, are given as parts.
