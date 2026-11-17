---
'@lincyaw/aegis-ui': minor
---

`Workbench`: a list beside a VS Code–style editor group, for a list and the
details of the records opened from it. `DetailBeside` is unchanged.

- Above 768 px it fills its flex parent (a bleed `PageWrapper` under the page
  bar, as `PaneLayout` does): the list and the group each scroll inside
  themselves. Opening or switching a tab never scrolls the list, and the
  clicked row is put back where it was when the group narrows the list; the
  detail starts at its top. With no tabs there is no group and the list spans
  the full width.
- The group is headed by a strip of tabs, `role="region"` named by the
  locale's `workbenchTabs` (标签页 / Open tabs), which scrolls sideways. Each
  tab (`{ key, name, href, closeHref, pinned, active, pinHref? }`) is a link
  named by the record, then a 关闭 link; the active tab's link carries
  `aria-current="page"` and the selection surface, and a preview tab
  (`pinned: false`) shows its name muted and regular weight. Double-clicking
  a tab follows its `pinHref`; `listPinHref(href)` does the same for a
  double-clicked list link. Links render through `linkComponent`.
- Only the active tab's `detail` is rendered.
- At 768 px or narrower an active tab's group covers the view below the
  header, headed by a 返回列表 link (`backHref`, the locale's
  `workbenchBackToList`), and the list moves off-canvas, still mounted and in
  the accessibility tree. With no active tab the list shows.
- Token `--workbench-tab-max-width` (240 px).
