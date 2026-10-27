---
'@lincyaw/aegis-ui': minor
---

Add the knobs the CGFS display pages had worked around, plus `IdentityCell` and `ButtonLink`. Every default keeps the current rendering.

- New primitives: `IdentityCell` (an optional Avatar with `colorSlot`, a name that can be a link through `linkComponent`, and an optional muted mono secondary line, stacked or `inline`; with a name alone it is one line centred on the avatar) and `ButtonLink` (a link with the Button look). Both take the router adapter type `LinkComponent`, which `Breadcrumb` now uses too.
- `Alert` `icon` replaces the tone dot. `Tabs` `listOnly` drops the tabpanel and `size="sm"` makes the list `--size-control-base` tall. `PageHeader` `titleExtra` sits beside the title, `description` accepts any node, and `--page-header-margin-bottom` sets the space under it.
- `Breadcrumb` items that are wider than the trail truncate with an ellipsis instead of widening the page.
- `SearchInput` `block` fills its container; `--search-input-height` and `--select-height` let a host line SearchInput and Select up at `--size-control-base`.
- `ShareLinkDialog` `url` shows a link that does not expire (no TTL presets, download toggle or countdown) and `description` adds a context line; its built-in text goes through the locale strings (`shareLink*`, `clipboardUnavailable`).
- `useCopyToClipboard` is exported from the package root.
- `DataTable` `stickyFirstColumn` keeps the first column (and the selection column) in view, column `cellTone` washes a cell in a tone graded in five steps (`--data-table-cell-tone-step`), and `stale` dims out-of-date rows and marks the table busy.
- `ParetoChart` `legend` lists series swatches under the plot and `empty` replaces the plot at its minimum height while there are no points.
- `Timeline` `density="compact"` keeps titles on one line with an ellipsis and tightens the rows.
- `Chip` size `md` centres its label without vertical padding, so a fixed `--chip-height-md` such as 24 px no longer overflows its content box.
- `ControlListItem` `description` adds a muted line that inverts with `active`.
- Tokens `--metric-label-transform` / `--metric-label-tracking` (MetricLabel) and `--stat-block-emphasized-size` (StatBlock `emphasized`).
- Shell: `AegisShell` `appSwitcher={false}` hides the app launcher and `elevateHeaderOnScroll` gives the sticky header a shadow once the page scrolls.
