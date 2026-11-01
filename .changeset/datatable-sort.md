---
'@lincyaw/aegis-ui': minor
---

`DataTable` sorts. A column with `sortable` turns its header into a sort control with `aria-sort`; with `sortValue` the table orders the rows itself (a `null` value last in either direction, ties keeping their order), and without it the host orders `data`, for instance from a URL parameter, and the header only shows the state. The table takes `sort` (controlled), `defaultSort` and `onSortChange`; a first click sorts numeric columns high first unless the column sets `firstSortDirection`. Row indices passed to `render` and the other callbacks count in the sorted order.
