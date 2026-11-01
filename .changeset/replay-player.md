---
'@lincyaw/aegis-ui': minor
---

Add the replay parts, for replaying an agent run or a game step by step:

- `useReplayPlayback` holds the current step and plays a replay one step at a time (each step lasting `stepDurationMs` at speed 1, divided by `speed`), stopping at the last step and pausing while the page is hidden; `autoPlay` stays off under reduced motion. It returns `index`, `playing`, `seek`, `previous`, `next`, `play`, `pause` and `toggle`, controlled or uncontrolled.
- `ReplayScrubber` is the position: a slider from the first step to the last with event markers above it (`ChartColor` dots), the first, current and last step labels below, dragging, and arrow / Page Up / Page Down / Home / End keys.
- `ReplayTransport` holds step back, play or pause and step forward, the position text, an optional speed switch and an `extra` slot for further controls such as a players' view switch.
- `ReplayStepStrip` draws every step as a bar in its kind's colour (taller for `emphasis` steps), numbers the key moments above it and ticks steps below; with `onSelect`, bars select their step and arrow keys move between them with one tab stop.

New tokens `--replay-scrubber-track`, `--replay-scrubber-thumb`, `--replay-transport-button`, `--replay-transport-play`, `--replay-strip-bar`, `--replay-strip-bar-emphasis` and `--replay-strip-gap`, and locale strings for the controls.
