---
'@lincyaw/aegis-ui': minor
---

Add `TreeTable`, a table whose rows form a tree.

Added:

- `TreeTable` draws `data`, the top-level rows, and under each the rows
  `getSubRows` returns for it, on columns that every row shares, as a
  `DataTable`'s do. A `TreeTableColumn` has a `key`, a `header`, a `render`
  that gets the row and its `TreeTableRowState` (whether it is `expanded`,
  so a closed row can show what it hides), a `width` in px or as any grid
  track, `numeric` and `truncate`. The first column carries each row's
  indent and the caret that opens its children.
- Rows open through `expandedKeys` and `onExpandedKeysChange`, or by
  themselves from `defaultExpandedKeys`. `selectedKey` draws a row selected
  and `onSelect` takes a click, Enter or Space; in a table that tracks its
  open rows, a new `selectedKey` opens the rows above it.
- For assistive technology the table is a treegrid with one tab stop: ↑ ↓
  Home End move between rows, → opens a row or moves into it, ← closes it or
  moves to its parent.
- A row redraws only when its own props change, as long as `columns` stays
  the same between renders, and rows out of view skip their layout and
  paint, so a tree with thousands of open rows stays quick.
- At 768 px and below each row folds: its first cell on top, the other cells
  under it named by their headers, and a cell that draws nothing left out.
- Inside a `DetailBeside` the selected row carries the detail: beside it
  above 768 px, right after it at 768 px and below.
- `TreeTableColumn`, `TreeTableProps` and `TreeTableRowState` are exported.

The gallery shows a tree of test suites, a fleet of 3,128 rows that opens and
closes at once, an empty table, and a `TreeTable` in the `DetailBeside`
specimen.
