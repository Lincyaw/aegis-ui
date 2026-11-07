---
'@lincyaw/aegis-ui': minor
---

Add four primitives:

- `Steps` — a numbered step indicator for wizards. The current step inverts, earlier steps show a check, and an optional `onStepClick` turns every other step into a button; an item's `disabled` keeps it from being clicked. Each step's accessible name carries its number and its state (completed, current step, not yet available).
- `ChoiceCardGroup` — a single choice drawn as a grid of cards (`ChoiceCardOption`: title, description, meta, disabled). Each card is a native radio, so arrow keys move the choice; the chosen card inverts and the others lift on hover.
- `NumberField` — a text field for one number. `integer` refuses decimals, `min` / `max` / `step` drive the arrow and PageUp / PageDown keys, `unit` shows inside the field, and text that is not a number of the right kind is reported under the field while the host receives `undefined`.
- `Slider` — one number along a range on a native range input, with the formatted value shown above the track and given as `aria-valuetext`.
