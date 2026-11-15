---
'@lincyaw/aegis-ui': minor
---

`AnchoredPopover` takes `container`, the element it is drawn in, such as the page's `main`, so the popover belongs to that landmark; it is placed in the box of its nearest positioned ancestor and follows the anchor as the container or the page scrolls. Without it the popover is drawn in `document.body` as before. `CodeBlock` takes `onSelectedLinesAnchor`, which receives an anchor over the selected lines as drawn on mount and whenever the drawn selection changes, including a controlled `selectedLines` set from outside, such as from the page's address; it receives null while no line is selected.
