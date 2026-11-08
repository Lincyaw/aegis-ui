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
- `NotificationContextValue.error` means only a load that left no list to
  show. Once a list has loaded, a provider reports a failed refresh or retry
  through `liveError` and keeps `items`. `InboxPage` follows the same rule:
  an `error` with `items` keeps them under the out-of-date notice, and only
  an `error` with no items replaces the list.

New API:

- `NotificationContextValue.liveError`: set while keeping the list current
  fails (a poll, a real-time stream, or a refresh or retry of a list that
  has loaded), cleared when that succeeds.
- `NotificationBell` takes `liveError`. It draws a caution mark opposite the
  unread badge, which stays, describes the bell as possibly out of date and
  says so at the top of its popover. `ShellNotificationBell` fills it from
  the provider.
- `NotificationBell` takes `error` and `onRetry`. When the first load failed
  and there are no items, the bell draws the same caution mark and is
  described as unable to load, and its popover says the notifications
  couldn't load, with a "Try again" button when `onRetry` is set, instead of
  "You're all caught up." An `error` with items is shown like `liveError`.
  `ShellNotificationBell` fills both from the provider.
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
  chip. After Pin or Unpin it goes to that query's chip, or to "+N more"
  when an unpin moves the query into that list. After Delete it goes to the
  next query, or to "Save current" after the last, or to the bar itself
  when "Save current" is disabled. After a rename ends with Enter or Escape
  it goes back to the chip. Before, focus fell to the page. Its
  "+N more" list is now a dialog of queries, each with its Pin and Delete
  buttons, instead of a menu whose rows held buttons that were not menu
  items; it stays open through a delete.
- `NotificationBell`'s unread badge is an inverted surface instead of anomaly
  red: an unread count is not a failure.
- `NotificationBell`'s badge, unread count and item times, and `InboxPage`'s
  row times, are set in the numeric face with tabular figures instead of the
  code face.
