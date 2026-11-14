---
'@lincyaw/aegis-ui': minor
---

Reveal a `TraceTree`'s selected row under collapsed rows, let a
`Timeline`'s items be selected, export `RollingValue`, and add `RegionMap`,
a tree of regions drawn as nested tiles.

Changed:

- `TraceTree` reveals the row of `selectedId`: when the tree mounts, and
  each time `selectedId` changes, the rows it hangs under expand before it
  is drawn. With `defaultCollapsedDepth` a large tree opens with only the
  path to the selected row expanded, and a selection made outside the
  tree, such as by a link, opens the path to its row. Rows the viewer
  collapses afterwards stay collapsed.

Added:

- `Timeline` takes `selectedId`, `onSelect`, `scrollable` and `ariaLabel`.
  With `onSelect` the list is a listbox whose items are options: one tab
  stop, ↑ ↓ Home End move between them, Enter or Space or a click selects,
  and the selected item is inverted, its title, timestamp, meta and dot
  included. `scrollable` bounds the list to the new
  `--timeline-scroll-max-height` token and scrolls it; the list keeps the
  selected item in view when it mounts and when `selectedId` changes,
  scrolling only itself, never the page.
- `RollingValue` and its `RollingValueProps` are exported: a number or
  numeric string whose digits roll to a new value, right column first, as
  in `StatBlock`, `MetricCard` and `HeadlineStat`.
- `RegionMap` draws a tree of regions as nested tiles that fill their
  container, like a territory map: each region holds the tiles of the
  regions inside it, and a region with more regions under it takes more
  room. A `RegionMapRegion` has a `label`, an optional `to` drawn as a link
  through `linkComponent`, a `count` that rolls to a new value, a `state`
  slot such as a `Chip`, and a `status` drawn as a dot, `active` pulsing as
  in `ServiceMap`. `selectedId` draws a tile inverted and `onSelect` takes a
  click on a tile. For assistive technology the map is a tree read region
  by region, each tile named by its label and described by its count and
  state, with one tab stop: ↑ ↓ in reading order, → into a region, ← out of
  it, Enter follows the link and Space selects. The tiles narrow at 768 px
  or below. `RegionMapProps`, `RegionMapRegion` and `RegionMapStatus` are
  exported, with the tokens `--region-map-tile-basis` and
  `--region-map-tile-basis-narrow`.
