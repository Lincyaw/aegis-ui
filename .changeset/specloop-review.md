---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Fixes from the specloop frontend review:

- Panel: `elevation="flat"` casts no shadow, for a panel inside another
  panel, so each layer has one shadow.
- MonoValue: `wrap` still breaks a long value anywhere, but a text or
  number value is never broken narrower than itself or 16 characters,
  whichever is less, so `null`, `true` and `1` stay whole in a squeezed
  column. The value is now an inline block.
- CommitGraph: several `grow` columns share the width the other columns
  leave evenly, and a growing column is never narrower than about 20
  characters; where the others leave less, the table scrolls sideways.
  A message column stays readable at 768 px.

The gallery has a nested Panel, short and long wrapped MonoValues in a
squeezed table, and a version-map table whose lane columns grow.
