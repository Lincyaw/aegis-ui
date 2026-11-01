---
'@lincyaw/aegis-ui': minor
---

Add `ScrollStory`, which tells a story in steps: the steps scroll as ordinary text while a panel beside them stays pinned and shows the current step's visual, and at 768px and narrower each visual follows its own step. Add `useScrollProgress`, which reports how far an element has travelled through the view as a number from 0 to 1 over a CSS `animation-range` style range (`entry`, `exit`, `cover` or `contain`), for motion tied to the scroll position such as a chart that draws as it comes into view; it stays at 1 under prefers-reduced-motion. New tokens `--scroll-story-sticky-top`, `--scroll-story-view-height` and `--scroll-story-step-min-height` set where the panel pins, the height of the view it pins in (set it to the container's height when passing `scrollContainer`) and how tall each step is.
