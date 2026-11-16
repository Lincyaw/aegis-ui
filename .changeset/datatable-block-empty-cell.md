---
'@lincyaw/aegis-ui': patch
---

- `DataTable` `appearance="blocks"`: a cell whose `render` returns `null` or
  `undefined` stays an empty cell in its column's place, so every row keeps
  one cell per column for assistive technology and for readers that pair
  cells with headers by position. It draws no `blockLabel` and takes no
  space in the block.
