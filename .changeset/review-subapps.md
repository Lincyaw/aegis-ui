---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Breaking:

- Remove `BucketCard`. It mirrored the blob API and had one consumer, so the
  blob sub-app now composes its own card from `Panel`, `Chip` and
  `MetricLabel`. Hosts that rendered `BucketCard` should do the same.

Additions:

- `TableOfContents` items take `level: 4`, indented one step past level 3, so
  a page can list h1 to h4.
- `TableOfContents` tracks sections that mount after it, or are re-created
  later, such as the headings of a lazily loaded `Markdown` body.
- `FileTree` files take a `label` shown in place of the file name, for
  example a note's name without `.md`; the row's title keeps the path.
