---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Let a test or a screen reader read tables, regions, graphs and errors by
role and name:

- DataTable: `ariaLabel` names the table. Header cells carry
  `scope="col"`, so they are column headers. A selected row of a
  `selectable` table is `aria-selected`. The row-click chevron column and
  the empty state are no longer read as a column or a row, and `loading`
  marks the table `aria-busy` as `stale` does.
- Panel: a panel with a `title` is a `region` named by its title.
- ErrorState is an `alert`.
- ServiceMap: each edge is a `group` named
  `<source label> → <target label>`. The node that `selectedNodeId` names
  is `aria-current`. A group box carries no role or name, since its nodes
  are not inside it in the DOM.
- CommitGraph: `columns` draws the commits as a table, the graph in the
  first column and then one column per entry, each row's cells from
  `CommitGraphCommit.cells`. A cell is one line, cut to the row's height.
  A `grow` column takes the width left and cuts its cells off; hovering a
  cut cell shows it whole. With `onSelectedIdsChange` the checkbox sits in
  the first column, named by that cell, and a selected row is
  `aria-selected`. `CommitGraphCommit.title` is now optional, since a
  table does not show it. In a list and in a table, a row's lane and
  merge are its accessible description instead of hidden text in the row.

The gallery has a specimen for each.
