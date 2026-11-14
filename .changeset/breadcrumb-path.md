---
'@lincyaw/aegis-ui': minor
---

Let a `Breadcrumb` be named, and let its trail end at a page other than the
current one.

Added:

- `Breadcrumb` takes `ariaLabel`, the navigation's accessible name. Without
  it the name is the locale's `breadcrumb`, as before.
- `BreadcrumbItem` takes `current`. When no item sets it, the last item is
  the current page and renders as text, as before. Once any item sets it,
  every item with `to` renders as a link, the last included, and only the
  items set to `true` carry `aria-current="page"` and the main ink. A current
  item with `to` is a link that the `linkComponent` receives with
  `aria-current="page"`.
