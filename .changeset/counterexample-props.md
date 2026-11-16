---
'@lincyaw/aegis-ui': minor
---

- `ColumnLayout` `gap='sm'`: `--space-2` between children, for lines
  stacked inside a table block.
- `DataTable` `appearance="blocks"`: a cell whose `render` returns `null` or
  `undefined` is left out of its block, with its `blockLabel`. Table rows
  keep every cell.
- `FilePreview` `variant='thumbnail'`: the preview bounded to the new
  `--file-preview-thumbnail-size` (160 px) on each side, for an image beside
  other content. `maxHeight` still overrides its height; the default
  `variant='viewport'` keeps the stock look.
