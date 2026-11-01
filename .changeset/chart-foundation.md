---
'@lincyaw/aegis-ui': minor
---

The chart primitives share one foundation:

- `ChartColor` colours a series with a palette colour (`seq`, `cat-1`…`cat-6`, `unknown`) or a host token such as `var(--series-openai)`, so a vendor keeps one colour on every chart. `StackedBarSeries.color`, `ParetoPoint.color` and `ParetoLegendItem.color` take it, and `RankBarItem` gains `color`. Breaking: `StackedBarColor` is gone (use `ChartColor`), and `ParetoChart` colours no longer accept arbitrary CSS, only palette names or `var(--…)` tokens.
- `ChartLegend` is the legend `StackedBar` and `ParetoChart` draw, with `square` or `dot` swatches, for a host's own charts too.
- `RankBar`, `StackedBar` and `ParetoChart` take `progress` (0–1, e.g. from `useScrollProgress`): bars scale in from the left row by row and Pareto points fade in from left to right, following the scroll both ways instead of playing once.
- Breaking: `RankBar`'s scale defaults to the largest value, as documented (it treated anything up to 1 as out of 1); pass `max={1}` for a share or a 0–1 score.
- `TimelineChart` ticks sit at round offsets from the start (0, 0.5 s, 1 s) instead of round absolute times, cannot stall on nanosecond timestamps, and span kinds take the data palette.
- Chart numbers (`RankBar` values and ticks, `ParetoChart` ticks, `TimelineChart` labels) use the tabular UI face instead of the mono face, which is for ids and code; Pareto points fade in rather than scaling.
- `chartColorValue`, `zeroAnchoredDomain`, `niceTicks` and `staggeredProgress` are exported for host charts.
