---
'@lincyaw/aegis-ui': minor
---

Reveal a `TraceTree`'s selected row under collapsed rows.

Changed:

- `TraceTree` reveals the row of `selectedId`: when the tree mounts, and
  each time `selectedId` changes, the rows it hangs under expand before it
  is drawn. With `defaultCollapsedDepth` a large tree opens with only the
  path to the selected row expanded, and a selection made outside the
  tree, such as by a link, opens the path to its row. Rows the viewer
  collapses afterwards stay collapsed.
