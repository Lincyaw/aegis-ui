---
'@lincyaw/aegis-ui': minor
---

Add `LocaleProvider` with `enStrings` (default) and `zhCNStrings`, and route the strings that primitives and the shell render on their own through it. `useCopyToClipboard` now uses `copy-to-clipboard`, so copying works on plain-HTTP pages. `joinPath` keeps a query string on app-relative links and the breadcrumb matches sidebar items by path. `SessionRunTrajectoryView` hides empty start-time and token fields. `Select` gains `ariaLabel` and truncates long options; the `DataTable` header checkbox keeps selections made on other pages.
