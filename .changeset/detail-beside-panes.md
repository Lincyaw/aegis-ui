---
'@lincyaw/aegis-ui': minor
---

`DetailBeside` takes `layout="panes"`, a pane form set directly in a `PaneLayout`: the list and the selected row's detail are two `Pane`s (`listPane`, `size` `fill` by default; `detailPane`, `lg` by default) divided by a hairline, each scrolling on its own, with the detail at its pane's top. Panes before the list, such as a tree, stay the host's own. A reveal scrolls the list's pane to the row and the detail's pane to its top. At 768 px and below the detail opens right after the selected row, as the column form does, and a reveal scrolls the nearest scroller around the list. The column form, `columns`, is unchanged.
