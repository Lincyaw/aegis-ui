---
'@lincyaw/aegis-ui': minor
---

Fixes to the public-site frame and the chart foundation:

- `--site-column` is the site's content column, used by `SiteNav`, `SiteSection` and `SiteFooter`. Its gutter is 120 from a 1280 window up, then shrinks so the column holds 1040 and narrows without a jump, and is `--space-4` at 768 and narrower. Breaking: `--site-gutter` is now that computed gutter and `--site-gutter-mobile` is gone; set `--site-gutter-wide` or `--site-content-width` to change the column.
- `SiteLayout` sets `--header-height` and `--scroll-story-sticky-top` from the site nav, so article headings, anchors and a pinned `ScrollStory` panel stop below the floating nav instead of under it.
- The `SiteNav` menu closes on any click outside it and when `activeKey` changes, and its button rises on hover like the shell's.
- The footer's mobile link columns wrap by `--site-footer-column-min` instead of a fixed three; `--site-wordmark-size` is documented as tuned for an eleven-letter wordmark.
- `RankBar` and `StackedBar` draw by scroll with a clipped slide instead of `scaleX`, so the leading edge keeps its rounded corners. Pareto points drop their opacity transition while scroll-driven.
- `niceTicks` keeps the top tick when the end is a multiple of the step (0.6 by 0.2), rounds ticks to the step's decimals and never returns `-0`.
- `AegisShell` and `SiteLayout` share one skip link; the shell's skip link class is now `aegis-skip-link`.
