---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Give each kind of change one motion, shared across primitives:

- Tabs' indicator leads with the edge facing the move and trails with the
  far edge, so it stretches across and settles (`--motion-lead`,
  `--motion-trail`).
- DataTable, EventTable, ObjectBrowser and TimelineChart develop their
  loaded content out of a soft blur when it replaces the skeleton
  (`--motion-develop`, `--motion-develop-blur`); Reveal rises out of the
  same blur, and its stagger stops growing after
  `--motion-reveal-stagger-max` siblings.
- StatBlock, MetricCard and HeadlineStat roll a changed value's digits,
  right column first (`--motion-roll`); screen readers and copy still read
  the value whole.
- CodeBlock and MetadataList copy buttons merge their two pages and draw a
  check.
- ToolCallCard's running label carries a scanning band of brighter ink.
- antd popovers and tooltips fade in from their trigger's side instead of
  zooming (`--motion-popover-offset`), and every antd easing maps onto the
  token curves, so nothing in antd overshoots.

The gallery's Shape, elevation & motion panel lists the new tokens and
plays the select, roll and develop moments.
