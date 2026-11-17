---
'@lincyaw/aegis-ui': patch
---

`Workbench`: at 768 px or narrower an active tab's group covers only the
workbench's own box (`position: absolute; inset: 0` in a positioned
workbench) instead of the viewport below the shell header, so the page's own
bar above it (the menu toggle, the title, the page controls) stays visible
and usable, with 返回列表 right below it.
