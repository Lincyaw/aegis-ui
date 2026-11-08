---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Move focus into opened surfaces, ring focus where it was clipped or grey,
and say when notifications may be out of date.

Changed behaviour:

- `AskPanel` takes focus when it mounts: its question field, or the panel
  when no agent is connected. On unmount focus returns to the element that
  had it. A host that renders an inline panel should mount it when the user
  opens it, not on page load.

New API:

- `NotificationContextValue.liveError`: set while live updates (a poll, a
  real-time stream) are failing, cleared when one succeeds. `error` still
  means the list failed to load.
- `NotificationBell` takes `liveError`. It draws a caution mark opposite the
  unread badge, which stays, describes the bell as possibly out of date and
  says so at the top of its popover. `ShellNotificationBell` fills it from
  the provider.
- `InboxPage` takes `liveError`. It keeps the list under a caution notice
  with the `onRetry` button. `ShellInboxPage` fills it from the provider.

Fixes:

- `Collapse` no longer clips the focus ring, field halo or shadow of content
  at the edge of an open panel. It clips only while a panel is closed or
  moving. Closed panels stay inert.
- antd `Tree` keyboard focus draws the focus ring, inset, around the tree
  and then around the arrow-key active node. Before, it was a grey outline
  that disappeared on hover, then a grey fill.
- `NotificationBell`'s dropdown, `TimeRangePicker`, the shell's app
  switcher and `SavedQueryBar`'s chip menu, "+N more" list and save form
  move focus into themselves when they open. Escape, and Tab or Shift+Tab
  out of either end, close them and return focus to the trigger, as does
  picking an item that applies, navigates or saves. The menus take arrow
  keys, and every trigger gains `aria-haspopup`, `aria-expanded` and
  `aria-controls`. `NotificationBell` and `TimeRangePicker` slide along
  their trigger to stay on a phone screen.
- `SavedQueryBar` places focus itself when an action moves or removes a
  chip: after Pin or Unpin on that query's chip, after Delete on the next
  query or on "Save current" after the last, and after a rename ends with
  Enter or Escape back on the chip. Before, focus fell to the page. Its
  "+N more" list is now a dialog of queries, each with its Pin and Delete
  buttons, instead of a menu whose rows held buttons that were not menu
  items; it stays open through a delete.
- `NotificationBell`'s unread badge is an inverted surface instead of anomaly
  red: an unread count is not a failure.
