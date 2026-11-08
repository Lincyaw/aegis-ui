---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Fit tables, lists and navigation to narrow containers, ring every focus
the tables and pickers drew grey or hid, and name a TimeRangePicker from
a FormRow.

Changed behaviour:

- A `DataTable` with `stickyFirstColumn` caps the pinned first column at
  40% of the table's visible width and truncates past it, so the other
  columns keep room to scroll on a phone. An expanded row's detail stays
  in view beside the lead columns instead of spanning the whole table.
- `TimelineChart` at 768 px and below puts each span's name on its own
  line above its bar instead of a 40% label column.
- `ObjectBrowser` fills its container and wraps the main pane under the
  tree when beside it the pane would have less than half the width,
  whatever the container's width.
- `Tabs` that overflow fade out at the edge that has more tabs, and
  scrolling a tab into view leaves room for the fade.

New API:

- `TimeRangePicker` takes `id`, `aria-labelledby` and `aria-describedby`.
  Inside a FormRow, give the row `labelBy='aria-labelledby'` and pass
  `${controlId}-label`: the picker is then named by the row's label
  followed by its range.
- `--tabs-indicator-bg`: the selected tab's pill in segmented Tabs,
  lighter than its track in both themes.

Fixes:

- `DataTable`, `EventTable` and `TimelineChart` draw the focus ring,
  inset, around a focused scroller, over sticky headers and cells.
  `DataTable`'s ring hugs the scroller and leaves out the pagination
  footer: the scroller now sits in its own `.aegis-data-table__scroll-frame`
  box, which draws the ring.
  `TimeRangePicker`'s trigger, `PasswordField`'s show button,
  `ObjectBrowser`'s tree items and `SavedQueryBar`'s chips, menu and
  "+N more" button draw the focus ring instead of a grey outline, and
  their text fields take the brand border and halo.
- `Chip`'s remove button and `Select`'s clear button take a 24 px target.
- `DataTable` cells pad less at 768 px and below, and a selection
  checkbox sits centred in its cell. `EventTable`'s truncated cells line
  their text up with the level chip.
- `DataList` sizes its columns to their content, so names are no longer
  cut short beside narrow columns.
- `CheckGrid` breaks long row and column labels after `_ . / : -` rather
  than mid-word.
- `KeyValueList` uses tabular figures and wraps a long value under its
  key instead of squeezing the key.
- `Breadcrumb` stays on one line and truncates its items. `Toolbar`'s
  right slot ends the line when the toolbar wraps. `SectionDivider` and
  `Panel` headers wrap their extras under the title on a narrow card.
- `SearchInput` shrinks with its container instead of spilling out of it,
  in `SavedQueryBar` and `ObjectBrowser`.
- `TimeRangePicker`'s popover keeps a margin from the screen's edges on a
  phone; its hints and From / To labels are no longer uppercase, and its
  date inputs use tabular figures and take `--radius-md`.
- `SavedQueryBar`'s "Save current" label is no longer uppercase. Its
  delete action uses the caution text colour, `--text-warn`, instead of
  anomaly red, in the chip menu and the overflow list. "Save current" and
  the save form's Cancel and Save are pills (`--radius-pill`), and the name
  field takes `--radius-xs`, nested inside the popover's corner.
- `Skeleton` is visible on dark surfaces.
