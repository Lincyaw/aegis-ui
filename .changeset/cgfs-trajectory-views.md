---
'@lincyaw/aegis-ui': minor
---

Fit the trajectory and trace primitives to recorded agent runs. Every default keeps the current rendering.

- The text that `TrajectoryTimeline`, `TrajectoryStep`, `ToolCallCard`, `TraceTree`, `TraceSpanInspector`, `ObjectInspector` and `TimelineChart` render on their own goes through the locale strings (`trajectory*`, `toolCall*`, `traceSpan*`, `inspector*`, `expandRow` / `collapseRow`, `resizeNameColumn`, `noAttributes*`, `maximize*` / `restore*` / `closeInspector`, `timelineEmpty*`), with `zhCNStrings` values.
- `TrajectoryStepData` gains `summary` (the head's preview, defaulting to `action`), `toolCalls` (further calls of the step, each a card after `toolCall`) and `sections` (`TrajectoryStepSection`: labelled texts after the thought and action, as Markdown or, with `format: 'text'`, preformatted and capped at `--trajectory-step-text-max-height`).
- `TrajectoryTimeline` `header={false}` drops the agent, status and duration header.
- `TraceSpan.startMs` and `durationMs` are optional: a span without them draws no bar and no duration, siblings that are not all timed keep their given order, and a tree with no timed span shows its labels alone. `TraceSpanInspector` omits the missing timing and takes `detail`, the span's content under the facts in the Overview tab.
