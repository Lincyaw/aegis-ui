---
'@lincyaw/aegis-ui': minor
---

`useResizable` gains `keyboardStep` (arrow-key step, default 16 px) and `constrainWidth` (narrows a proposed width after the min/max clamp, e.g. to keep a neighbouring pane above its minimum), handles Home / End (move the handle to its leftmost / rightmost position), and returns `reset()` to restore `initialWidth`. `ResizableSidePanel` passes `keyboardStep` and `constrainWidth` through and adds `resetOnDoubleClick`.
