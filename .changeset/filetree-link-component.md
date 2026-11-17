---
'@lincyaw/aegis-ui': patch
---

- `FileTree` `linkComponent`: with `fileHref`, file links render through the
  host's router adapter, so following one does not reload the page. The row
  stays the `treeitem` and its link sits inside, out of the tab order; a
  click anywhere on the row, Enter and Space all follow the link and select
  the file. Without it file rows are `<a href>` tree items as before
  (`fileTarget` applies only there).
- `Workbench`: a double-click on a list row outside its link, such as on a
  table cell or a tree row's indent, pins through the row's link as well.
