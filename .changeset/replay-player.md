---
'@lincyaw/aegis-ui': minor
---

Add the replay parts, for replaying an agent run or a game step by step:

- `useReplayPlayback` holds the current step and plays a replay one step at a time (each step lasting `stepDurationMs` at speed 1, divided by `speed`; a speed change rescales what is left of the step), stopping at the last step and pausing while the page is hidden; `autoPlay` stays off under reduced motion. It returns `index`, `playing`, `seek`, `previous`, `next`, `play`, `pause`, `toggle`, and `hold` / `release` to suspend advancing while the reader drags, controlled or uncontrolled.
- `ReplayScrubber` is the position: a slider from the first step to the last with event markers above it (`ChartColor` dots, whose labels the slider's value text reads at their step), the first, current and last step labels below, dragging (`onScrubStart` / `onScrubEnd`), and arrow / Page Up / Page Down / Home / End keys.
- `ReplayTransport` holds step back, play or pause and step forward, the position text, an optional speed switch (a radio group) and an `extra` slot for further controls such as a players' view switch.
- `ReplayStepStrip` draws every step (`ReplayStepStripItem`) as a bar in its kind's colour (taller for `emphasis` steps), numbers the key moments above it and ticks steps below; the gap between bars narrows for long runs, so hundreds of steps still draw. With `onSelect`, bars select their step and arrow keys move between them with one tab stop; without it the steps are a list with their labels.

New tokens `--replay-scrubber-track`, `--replay-scrubber-thumb`, `--replay-transport-button`, `--replay-transport-play`, `--replay-step-strip-bar`, `--replay-step-strip-bar-emphasis` and `--replay-step-strip-gap`, and locale strings for the controls.
