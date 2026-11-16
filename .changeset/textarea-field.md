---
'@lincyaw/aegis-ui': minor
---

- `TextArea`: a field for text of several lines, with TextField's label,
  helper text, error and disabled states; `rows` sets the visible lines
  (default 4) and the viewer can drag it taller.
- `DataTable` `blockSeparator='rule'`: rows of `appearance="blocks"` set
  apart by a hairline under each, edge to edge, for a master list beside
  its detail. The default `gap` keeps the stock spacing.
- `Timeline`: the selected item of the `list` and `listbox` modes reads the
  `--selection-*` tokens, as TraceTree's selected row does; their defaults
  keep the inverted look.
- `DetailBeside`: a detail taller than its bound (the view, less the
  selected row at 768 px and below) scrolls inside it instead of spilling
  over the rows that follow.
