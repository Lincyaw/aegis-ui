---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Let every field control in a FormRow be named by the row's label and
described by its description.

Added:

- `FormRow` gives its label the id `${controlId}-label`, and takes
  `labelBy='aria-labelledby'` for a control a `<label>` cannot name, such
  as a meter or a radio group: the label is then plain text, the row is no
  longer a group, and the control takes `${controlId}-label` as its
  `aria-labelledby`. The default, `labelBy='for'`, renders the
  `<label for={controlId}>` as before.
- `Select`, `Slider`, `NumberField`, `Checkbox`, `SearchInput`,
  `PickerField`, `ChoiceCardGroup` and `BlastRadiusBar` take
  `aria-describedby`. `NumberField` reads it before its own helper or
  error text; `Slider` keeps its value out of the name and description.
- `Checkbox` and `SearchInput` take `id`. A `SearchInput` with an `id` is
  named by its `<label>` instead of its placeholder.
- `BlastRadiusBar` and `ChoiceCardGroup` take `aria-labelledby` in place
  of `label` / `ariaLabel` (exactly one of the two), so a FormRow can name
  them once. `PickerField` takes `aria-labelledby` in place of `label`
  and keeps its value in its name.

Fixed:

- In a FormRow stacked at ≤768 px, `Select` and `PickerField` fill the
  row like the text fields beside them.
- `niceTicks` keeps an end tick that is a multiple of the step however far
  from zero it lies (nanosecond timestamps, `123456.794` with a step of
  `0.001`), keeps ticks of steps from `1e23` up exact, and no longer
  returns duplicate ticks for a span only a few doubles wide or as wide
  as ±1e308. A step below `1e-100`, which threw, now gives the ticks of
  that step, subnormal steps included. A `count` that is not positive, or
  a step past the largest double, gives no ticks.

The inject wizard's selects, sliders and number fields are described by
their rows, and its Blast radius meter is named once.
