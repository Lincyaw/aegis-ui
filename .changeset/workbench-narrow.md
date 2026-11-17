---
'@lincyaw/aegis-ui': patch
---

`Workbench`:

- At 768 px or narrower it no longer grows the page: it fills a bleed
  `PageWrapper`'s height with a zero basis, and the list scrolls inside it.
  An active tab still moves the list off-canvas.
- `leading`, `leadingSize` (`'sm'` by default) and `leadingLabel`: a pane
  before the list, e.g. an area tree. Above 768 px it sits left of the list
  and scrolls itself; at 768 px or narrower it stacks above the list in one
  scrolling column, which an active tab moves off-canvas with the list.
- The clicked row stays in place while the list settles after a tab opens
  (rewrapping, late reflows) for up to a second, until the reader scrolls;
  the list sets `overflow-anchor: none` so the browser's own anchoring does
  not move another row instead.
