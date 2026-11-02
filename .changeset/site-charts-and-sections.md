---
'@lincyaw/aegis-ui': minor
---

Primitives for a public results site.

- New: `SiteAnchorNav`, `SiteSectionHeader`, `HeadlineStat`, `SeriesLabel`, `KeyMomentCard`, `ThoughtCard`, `AgentHud`, `ResultMatrix`, `Heatmap`, `ColumnChart`, `DotRangeChart` and `LineChart`.
- `RankBar`: `interval` on an item and `size='sm'`.
- `StackedBar`: `normalize` and `onSegmentSelect`.
- `ParetoChart`: `xScale='log'`, `xDomain`, `yDomain`, `xTicks`, `yTicks`, `labels='all'`, `fadeDominated`, `highlightKeys`, `maxHeight` and `frontProgress`. Scroll progress now traces the frontier instead of fading it in.
- `ReplayStepStrip`: `size='sm'`, `playhead` and a per-step `weight`. The row of key moments is left out when there are none.
- `ChartLegend`: `hollow` on an item.
- Tokens: `--series-<vendor>` for model vendors, `--replay-<kind>` for replay steps and the `--type-number-display-*` role.
