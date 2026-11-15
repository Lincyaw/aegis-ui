---
'@lincyaw/aegis-ui': minor
---

Add the primitives a pane-based app needs. `LineIcon` strokes a host's glyph paths on a 24-unit grid at 1.75 in the current colour, sized `sm` / `md` / `lg`. `PaneLayout` and `Pane` fill a region edge to edge with panes divided by hairlines, fixed (`--pane-width-sm` / `-md` / `-lg`), flexible or content-sized, stacking at 768 px or narrower. `Quote` sets off quoted text with a left rule, neutral or anomaly red. `Toolbar` takes `variant="page"` for a page's fixed-height top bar and `variant="sub"` for the row under it. `Breadcrumb` takes `variant="trace"`, whose items are pills of a `kind` and an identifier divided by chevrons, the current one in the brand's soft surface. `StatusDot` takes `tone="info"`. `SectionDivider` takes `variant="group"`, a sentence-case group label. `PageWrapper` takes `bleed`, and an `AegisApp` takes `bleed: true`, for pages that fill the view under the header without padding.
