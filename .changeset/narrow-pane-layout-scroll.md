---
'@lincyaw/aegis-ui': patch
---

At 768 px and below a stacked `PaneLayout` no longer scrolls on its own: the bleed page grows with its panes and the window scrolls, so a `DetailBeside` reveal of a row far down scrolls the window and brings the row into view.
