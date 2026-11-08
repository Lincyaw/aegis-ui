---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Breaking:

- `CommandPalette`, `InboxPage`, `NotificationBell` and `SavedQueryBar` are
  presentational and take their data and callbacks as props:
  - `CommandPalette` takes `open`, `commands`, `onSelect`, `onClose` and an
    optional `groupOrder` (group labels in display order; unlisted groups
    follow alphabetically, and ungrouped commands join "Other", last unless
    listed). It is built on
    `Dialog` — focus trap, focus restore, scroll lock — with a combobox
    field over a listbox (`aria-activedescendant`). The unwired `>` and `?`
    modes are gone, and Escape is handled by the dialog alone, so it no
    longer closes the palette during an IME composition.
    `AegisShell enableCommandPalette` still mounts it from
    `<CommandProvider>`; set the order with the new `commandGroupOrder`.
  - `InboxPage` takes `items`, `unreadCount`, `onOpen` and `onMarkAllRead`;
    `NotificationBell` takes `items`, `unreadCount`, `onOpen`, `inboxPath`
    and a `linkComponent` for "View all". Neither imports react-router any
    more. Mount the new `ShellInboxPage` (filled from
    `<NotificationProvider>`, marks items read and follows their `to`) on
    the route `AegisShell inboxPath` names; the shell's bell is filled the
    same way. `Shell*` names the wrappers that fill a primitive from its
    provider.
  - `SavedQueryBar` takes `queries`, `onSave`, `onRename`, `onRemove` and
    `onTogglePinned` instead of `namespace`. `useSavedQueries({ namespace })`
    still keeps them in localStorage; call its `touch` in `onApply`.
- App environments are loaded by the app, not fetched by the library:
  `AegisApp.apiBaseUrl` is removed, and `AegisApp.environments` is now
  `{ load(signal), fallback?, storageKey? }`. `load` resolves the manifest,
  `null` when the backend declares none (then `fallback`, if given, is the
  current environment), or rejects — the header then shows the failure and
  retries on click, and `useEnvironmentManifest()` reports
  `{ status: 'error', error, retry }`. `discoveryPath` and
  `fallback: 'production' | 'hidden'` are gone, as are `fetchManifest`,
  `validateManifest`, `manifestUrl` and `clearManifestCache`.
  `EnvironmentChangedEventDetail.fromEnvId` is always a string.
- `Command.action` is removed; commands reach agents through the registry.
- The `aegisTheme` export is removed; use `getAegisTheme(resolved)`.

Added:

- `isAppVisible(app, status, user)` — the rule the shell uses to show an
  app to the current user.
- `AegisShell` catches a page that throws while rendering and shows the
  error with a retry in the page area; navigating elsewhere clears it.
- `CommandPaletteProps`, `InboxPageProps` and `NotificationBellProps` types.
- `NotificationContextValue.error` — why the last load failed, `null` once
  one succeeds. `InboxPage` takes `error` and `onRetry` and shows the
  failure with a retry in place of the list; `ShellInboxPage` passes
  the provider's `error` and `refetch` through.

Fixed:

- `useRegisterCommands` runs the latest render's `handler` and `undo`, and
  re-registers when a label, shortcut, scope or other described field
  changes.
- `parseTimeRangeInput` reads two separate dates (e.g. two pasted
  timestamps) as the range's start and end.
- `QueryAutocomplete` suggests values inside an opened quote
  (`service:"fro`).
- `AegisShell` decides a route is bare from the route react-router
  matched, so params, relative paths and trailing slashes work.
- Switching apps while one's environments load no longer leaves the next
  app loading.
- The sidebar's collapsed state, `useResizable`'s stored width and
  `useSavedQueries` read storage after hydration, so a server render
  hydrates cleanly; `useResizable` writes storage when a drag ends instead
  of on every frame. `ThemeProvider` leaves the theme `themeInitScript`
  set alone until hydration ends.
- InboxPage shows notification severity `warning` in the caution tone;
  the anomaly tone is kept for `error`.
- At 768 px and below the shell header keeps its brand and actions on one
  row: the brand truncates first, the environment switcher shows only its
  badge dot, and a failed environment load reads "Env error".
- `SavedQueryBar`'s save field gets a unique id, so two bars on one page
  no longer share a label target.
- At 768 px and below the menu toggle, an app's own header row and the
  page content share one inline edge, and the closed navigation drawer is
  hidden once it has slid out, so it casts no shadow at the screen edge
  and its links leave the tab order.
- At 768 px and below the open navigation drawer is modal: focus moves to
  its first link, with reduced motion too, the rest of the shell but the
  menu toggle is inert, and Escape or the backdrop closes it and returns
  focus to the toggle, which reports `aria-expanded` and reads "Close
  navigation" while the drawer is open. Widening the window past 768 px
  closes it.
- `TableOfContents` and `SiteAnchorNav` pick the current section again
  when content around the sections grows, shrinks, arrives or leaves (a
  diagram or image rendering), instead of waiting for the next scroll.
- Firefox draws scrollbars in the theme's colours, so the dark theme no
  longer shows light scrollbars.
- Links show the focus ring on keyboard focus: antd's global link reset
  (`a:focus`, `a:hover { outline: 0 }`) no longer removes it. The shell's
  sidebar links draw it inset, so the scrolling sidebar does not clip it.
- antd controls (buttons, breadcrumb, pagination, menu, tabs, checkbox,
  radio, switch and the rest) draw their keyboard focus ring in
  `--focus-ring-color` instead of the ink primary.
