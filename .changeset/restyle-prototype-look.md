---
'@lincyaw/aegis-ui': minor
---

Knobs for a host whose design draws rows as lines and blocks, references as
ids and states as dots:

- `--selection-*` tokens: the selected sidebar item and TraceTree row
  (`--selection-bg`, `--selection-ink`, `--selection-ink-muted`,
  `--selection-track`) and the selected DataTable, TreeTable and FileTree
  row (`--selection-row-bg`, `--selection-row-ink`). Defaults keep the
  inverted and muted fills.
- `--sidebar-nav-item-inset`, `--sidebar-nav-item-radius`,
  `--sidebar-nav-item-pad-y` for inset, rounded sidebar items, and
  `--brand-mark-ink` for a mark drawn in currentColor.
- DataTable: `header="hidden"` (read, not drawn), a column's `headerHidden`,
  and `appearance="blocks"` with `rowTone` and the columns' `block` and
  `blockLabel`: each row a block, still a table row for assistive technology.
- StatusDot `label`: the state as text that is read but not drawn; without
  `size` a dot takes `--status-dot-size`.
- SegmentBar: one short bar per item, coloured by state, each group's label
  read in order.
- MetadataList `layout="fields"` and `layout="inline"`.
- IdentityCell `mono`, `size`, `tone` and `leading`.
- SectionDivider `variant="title"`.
- CodeBlock `bare`.

IdentityCell's name and MonoValue's default tone now take the surrounding ink
instead of `--text-main`, so a selected row's ink reaches them. CodeBlock's
line numbers no longer overflow past 99 lines.
