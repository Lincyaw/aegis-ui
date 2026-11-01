---
'@lincyaw/aegis-ui': minor
---

Breaking: one span model and one trajectory model.

- `TimelineChart` takes the `TraceSpan[]` that `TraceTree` and `TraceSpanInspector` take, in milliseconds: a span draws a bar when it has `startMs` and `durationMs`, and its depth follows `parentId`. Its props become `minMs` / `maxMs` and `onSelect` (was `minNs` / `maxNs` and `onSpanClick`), and `TimelineSpan` is gone. `TraceSpan.kind` is a string, which colours the timeline bar and labels the tree chip, and `TraceSpan` gains `badge` for the bar.
- `SessionRunTrajectoryView`, `SessionRunOutputView` and their `SessionRun*` types leave the library: they rendered raw message blocks for one console app, beside the library's trajectory model (`TrajectoryStepData`, `ToolCallData`). The console keeps them with its trajectories app; their locale strings are gone too.
