---
'@lincyaw/aegis-ui': minor
---

Line breaking, motion curves, focus rings and a skip link follow the design conventions.

- Headings balance their lines and prose avoids a lone last word: `index.css` sets `text-wrap: balance` on `h1`–`h6` and `text-wrap: pretty` on paragraphs, list items, definitions, quotes and captions, and the title and description classes of `PanelTitle`, `PageHeader`, `Panel`, `Dialog`, `Alert`, `EmptyState` and `ErrorState` do the same.
- `--motion-fast` and `--motion-base` decelerate into place (`cubic-bezier(0.22, 1, 0.36, 1)`) instead of `ease` and the standard curve, and the agent highlight ring uses the same curve.
- A pressed button settles back from its hover lift.
- `InboxPage` rows, `NotificationBell` and its items, `PageSizeSelect` items and `TraceTree` rows show the focus ring on `:focus-visible` instead of a background change alone. Unread inbox rows keep their dot and drop the left bar.
- `AegisShell` opens with a skip link (`skipToContent` in the locale strings) that moves focus to `main` without a URL fragment.
- `PanelTitle` drops the `italic` prop and `SavedQueryBar`'s hint is no longer italic; no interface text is italic.
