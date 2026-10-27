---
'@lincyaw/aegis-ui': minor
---

Add opt-in knobs, component tokens and primitives for the CGFS display site. Defaults keep the current rendering.

- New primitives: `ScoreBar` (inline value plus a short bar), `RunPips` (passed/total plus one dot per run, collapsing to a proportional bar), `ColumnLayout` (column template that stacks at 768 px and below) and `PickerField` (a closed-Select look that opens a dialog).
- Shell: `AegisApp.breadcrumbBar: false` drops the breadcrumb bar for apps that render their own `Breadcrumb`.
- Component tokens: `--data-table-header-{bg,color,font-size,transform,tracking}`, `--data-table-row-{min-height,separator}`, `--chip-{transform,tracking}`, `--chip-font-size-{sm,md,lg}`, `--chip-height-{sm,md,lg}`, `--page-header-title-{size,size-mobile,weight}`, `--page-header-description-{size,color,transform,tracking}`, `--page-padding-inline(-mobile)`, `--rank-bar-fill`, `--pareto-dominated-opacity`, `--score-bar-*` and `--run-pips-*`.
- Theme: data-viz colours `--data-seq` and `--data-cat-1` … `--data-cat-6` (light and dark), motion tokens `--motion-enter`, `--motion-exit`, `--motion-chart`, `--motion-enter-offset`, `--size-icon-xl`, and Noto Sans SC in `--font-ui`.
- `DataTable`: column `numeric`, `renderMobileCard` for card rows at 768 px and below, and `onRowClick` with a hover chevron and Enter activation.
- `Chip` size `lg`; `MonoValue` `tone`; `Panel` `description`; `Alert` `success` tone and `title`; `StatusDot` `success` tone; `PageHeader` `meta`; `Timeline` `variant="numbered"` with item `marker`; `CodeBlock` `maxHeight`; `Avatar` `colorSlot`; `StatBlock` `animateValue`.
- `RankBar`: `value: null` renders an em dash over an empty track and the bar track is clickable with `onSelect`. `ParetoChart`: `formatX` / `formatY`, axes anchored at 0, ticks and labels at their CSS size at any width, gridlines, labelled frontier points, dimmed dominated points and an optional per-point `color`.
- Motion: bars draw in with a per-row stagger and slide between values, chart points stagger in, `Dialog` animates in and out, and `Collapse` expands smoothly with a rotating chevron. `prefers-reduced-motion` turns it all off.
