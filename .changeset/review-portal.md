---
'@lincyaw/aegis-ui': minor
---

Add two primitives:

- `Steps` — a numbered step indicator for wizards. The current step inverts, earlier steps show a check, and an optional `onStepClick` turns every other step into a button; an item's `disabled` keeps it from being clicked.
- `ChoiceCardGroup` — a single choice drawn as a grid of cards (`ChoiceCardOption`: title, description, meta, disabled). Each card is a native radio, so arrow keys move the choice; the chosen card inverts and the others lift on hover.
