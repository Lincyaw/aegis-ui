---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Let pages link from tabs and tree rows, show times in UTC, and mark the
current row of a table:

- Tabs: `TabItem.to` makes a tab a link, rendered by the new
  `linkComponent` prop. With links, Tabs is a `nav` of links that look
  like tabs, each one a tab stop, and the one `activeKey` names is
  `aria-current="page"`.
- TraceTree: `TraceSpan.to` makes the span's name a link, rendered by the
  new `linkComponent` prop. The row stays the tree's tab stop: the link
  has `tabIndex={-1}`, and Enter on the row follows it. Space still
  selects.
- `LinkComponent` takes an optional `tabIndex`; the default `<a>` and the
  shell's adapter pass it on to the anchor. Adapters of your own should
  pass it on too.
- TimeDisplay: `mode="utc"` writes `YYYY-MM-DD HH:MM:SS` in UTC, the same
  text in every time zone and on every day. `mode="hms"` writes an elapsed
  time as `H:MM:SS` in whole seconds, the hours neither padded nor capped
  (`0:00:05`, `27:03:09`), with the exact milliseconds as its tooltip.
- DataTable: the rows `selectedKeys` names are `aria-selected` and drawn
  selected, with or without `selectable`; without it there is no checkbox
  column. A selected row now has the `--bg-muted` fill.

The gallery has a specimen for each.
