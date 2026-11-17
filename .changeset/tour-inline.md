---
'@lincyaw/aegis-ui': patch
---

`Tour` gains an inline, link-driven mode; the default is unchanged.

- `inline`: the panel is drawn inside the page's `<main>` (the target's
  nearest, else the document's first) as `role="region"` named by `label`
  (default: the locale's new `tour` key, 引导 / Guide), never `aria-modal`. The
  step title (`h2`), the description and the `n / N` line stay inside it.
- `actionHref(action)` with `action` in `'prev' | 'next' | 'finish' | 'skip'`
  turns 上一步, 下一步, 完成 and 跳过 into links rendered by `linkComponent`
  (an `<a href>` without one). A click still calls `onChange` or
  `onClose(reason)`, so `useTour` records the end; Escape still skips.
- While a step shows, the page scrolls so the panel lies wholly in the
  viewport without pushing the target's top out of it.
- New type `TourAction`.
