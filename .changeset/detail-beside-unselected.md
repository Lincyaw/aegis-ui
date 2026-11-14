---
'@lincyaw/aegis-ui': patch
---

Stand a `DetailBeside`'s detail at the top of its column while its list
draws no row selected.

Fixed:

- When the selected row stopped being drawn, because a filter left it out or
  a closed row hid it, the detail stayed where that row had been, and beside
  a list that grew shorter it made the page longer than the list. It now
  stands at the top of its column until the list draws a selected row again.
