---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': minor
---

Add primitives for reviewing telemetry evidence.

Added:

- `CircuitGraph` draws services as chips, their endpoints as pins and the
  calls between them as wires, laid out left to right with dagre. Chips
  expand to show their pins, wires carry a tone, a width, a window pattern
  and an inferred mark, and a focus keeps the chosen chips and wires in the
  opening view at a readable zoom. `CircuitLegend` explains the encodings.
- `TimeSeriesChart` stacks small-multiple rows of lines or bars over a
  shared time axis, shades named windows and draws marker lines such as an
  injection time.
- `DecisionBar` shows a set of verdict options with tones, descriptions and
  one-key shortcuts.
- Tokens for the three primitives in `theme.css`, and their strings in both
  catalogues.

The console gains a Review app at `/review`: a reviewer works through the
items of a task, judges each against an evidence graph and timelines, and
saves a verdict to any server that implements `@lincyaw/review-api`, or
reads a static folder of its JSON files.
