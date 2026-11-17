---
'@lincyaw/aegis-ui': minor
---

- `Tour`: a guided tour over antd's Tour, themed through `getAegisTheme`. Each
  step (`{ target, title, description?, placement? }`) spotlights its target,
  given as a ref, a CSS selector or a function, beside a popover dialog
  (`role="dialog"` named by the step's title) with the position as `n / total`
  and the 跳过, 上一步 and 下一步 or 完成 buttons. Steps whose target is missing
  or hidden are left out of the tour and its count. `open`, `current` and
  `onChange` are controlled; `onClose(reason)` reports `'finish'` or `'skip'`
  (the skip button or Escape). `labels` overrides the button texts and the
  position line; the defaults come from the locale catalogue
  (`tourPrevious`, `tourNext`, `tourSkip`, `tourFinish`).
- `useTour(key, steps, { autoStart })`: opens the tour on the first visit and
  remembers a finish or skip in localStorage under `aegis-ui:tour:<key>`;
  `start()` replays it. `useTourLauncher()` starts the most recently mounted
  `useTour`, for a 引导 button in `AegisShell`'s `headerActions`.
- Token `--tour-width` (360 px).
