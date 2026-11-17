---
'@lincyaw/aegis-ui': patch
---

`Tour`: a step whose target sits at the very top of the view, such as a
control in a sticky page bar, no longer hangs the page. Keeping the panel in
view counts a scroll only when the scroller actually moved, and gives up
after three passes per step. The spotlight's margin is cut to the room
above and left of the target, so a target at the view's edge no longer
draws a mask with negative sizes.
