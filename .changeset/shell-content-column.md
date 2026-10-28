---
'@lincyaw/aegis-ui': patch
---

`AegisShell` sizes its content column `minmax(0, 1fr)`, so a header row wider than the viewport, such as a long list of app tabs on a phone, scrolls inside the header instead of widening the page.
