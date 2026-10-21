---
'@lincyaw/aegis-ui': patch
---

`PageSizeSelect` generates its label id with `useId()`, so several selects on one page no longer share `id="aegis-page-size-label"`.
