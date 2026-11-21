---
'@lincyaw/aegis-ui': minor
---

`AegisShell`: a `mobileBar` prop for `chrome="sidebar"`. At 768 px and
below a bar above `<main>` holds the drawer's toggle, the brand and
`headerActions`, so the actions stay in view while the drawer is closed;
at that width the sidebar's foot drops them, and a page's `ShellMenuToggle`
renders nothing. Wider windows keep the actions in the sidebar's foot only,
so exactly one copy is shown and in the accessibility tree at any width.
