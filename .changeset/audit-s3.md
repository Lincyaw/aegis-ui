---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Keep charts and ServiceMap readable on a phone, move destructive actions to
the caution tone, and fix focus rings, targets and dark-theme colours.

Breaking:

- `TableOfContents` no longer renders the `.aegis-toc__indicator` span, and
  the `--toc-indicator-height` token is removed. The current item is marked
  by `--accent-brand` text in the Strong role, with no rail. A host that
  styled the indicator or read the token drops those rules.

New API:

- `Button` takes `tone='caution'` (and `DropdownMenu`'s `triggerTone` with
  it): the caution wash and border for a destructive or irreversible
  action, with the label in the main ink. Use it instead of a red button;
  the anomaly red marks failures.
- Tokens `--chart-interval-color` and `--chart-interval-halo`: the interval
  that ColumnChart and RankBar draw over a bar, in faint ink inside a
  hairline of the panel colour, so it shows on an ink bar.

Changed behaviour:

- `DangerZone` is drawn in the caution tone (`--ink-warn` border on
  `--bg-warn-soft`) with `--radius-lg`, and its title stays in the main
  ink, instead of the anomaly red.
- `ServiceMap` shows a node's state with a dot before its label instead of
  a side stripe. At 768 px and below, a map that would fit only below a
  readable zoom opens at a readable zoom on its first node instead of
  fitting whole; the fit-view control still shows the whole map. Each map
  passes React Flow its own id, so the `react-flow__node-desc-*` and other
  React Flow ids are unique per map.
- `AegisShell`'s "Sign in" is a `Button` instead of an ink `Chip`.
- `Carousel`'s tabs take two columns at 768 px and below.
- Dark `--shadow-raised` and `--shadow-overlay` add a light ring and a lit
  top edge, brighter per level, so the dark elevations differ; the antd
  dark overlay shadow follows.

Fixes:

- `ServiceMap`: a focused edge draws its ring along its path; the zoom
  controls' ring is drawn inset so it is not clipped; a node or edge that
  takes keyboard focus pans fully into view; the badge count and edge rate
  use the numeric face with tabular figures.
- `ParetoChart`: point labels avoid the frontier and the y axis title.
- `SeriesLabel`: the detail shrinks before the name in a narrow slot.
- `SparkLine`: a flat series no longer fills the height.
- `ResizableSidePanel`: the handle and a scrolling body draw the full focus
  ring, inset.
- `DropdownMenu`: a trigger is at least 24 by 24 px.
- `BlastRadiusBar`'s ticks and `NotificationBell`'s unread count are no
  longer uppercase.
- Dark `--avatar-hue-5` no longer matches the dark anomaly red.
- The antd Tree's checkbox draws its tick and border in dark.
