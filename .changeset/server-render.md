---
'@lincyaw/aegis-ui': minor
---

The library renders on the server, so a site can prerender its pages:

- `useMediaQuery` and `usePageHidden` read as not matching / visible on the server, and `StatBlock` with `animateValue` renders its final value first and starts counting after mount, so prerendered HTML carries the real number.
- Primitives use layout effects only in the browser, so a server render logs no `useLayoutEffect` warnings from the library.
- `ThemeProvider` renders with `defaultPreference` on the server and while hydrating, then applies the stored choice; it follows other tabs' changes. New `themeInitScript(defaultPreference?)` returns an inline `<head>` script that sets `data-theme` before the first paint, so a prerendered page opens in the visitor's theme.
