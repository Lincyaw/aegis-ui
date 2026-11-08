---
'@lincyaw/aegis-ui': minor
'@lincyaw/console': patch
---

Let every field control in a FormRow be named by the row's label and
described by its description.

Breaking:

- `PickerField` takes exactly one of `label`, `ariaLabel` and
  `aria-labelledby`, and a `label` cannot be null. A PickerField with no
  name, or with both a `label` and an `ariaLabel`, no longer type-checks:
  keep the `label` when it is the visible caption, or pass only `ariaLabel`.
- `BlastRadiusBar`'s `label`, released in 0.10.0, is renamed `ariaLabel`,
  and the bar takes exactly one of `ariaLabel` and `aria-labelledby`.
  Replace `label="…"` with `ariaLabel="…"`, or, inside a FormRow, pass
  `aria-labelledby` so the row's label names the meter.

Added:

- `FormRow` gives its label the id `${controlId}-label`, and takes
  `labelBy='aria-labelledby'` for a control a `<label>` cannot name, such
  as a meter, a radio group or a code editor, or a control whose content
  belongs in its name, such as PickerField: the label is then plain text,
  the row is no longer a group, and the control takes `${controlId}-label`
  as its `aria-labelledby`. The default, `labelBy='for'`, renders the
  `<label for={controlId}>` as before.
- `Select`, `Slider`, `NumberField`, `Checkbox`, `SearchInput`,
  `PickerField`, `ChoiceCardGroup`, `BlastRadiusBar`, `CodeEditor` and
  `QueryAutocomplete` take `aria-describedby`. `NumberField` reads it
  before its own helper or error text; `Slider` keeps its value out of the
  name and description.
- `Checkbox`, `SearchInput`, `CodeEditor` and `QueryAutocomplete` take
  `id`. A `SearchInput` with an `id` is named by its `<label>` instead of
  its placeholder, and a `QueryAutocomplete` with an `id` or an
  `aria-labelledby` drops its default name. `CodeEditor` puts its `id`,
  `aria-labelledby` and `aria-describedby` on its editable area.
- `ChoiceCardGroup` takes `aria-labelledby` in place of `ariaLabel`
  (exactly one of the two), and `PickerField`, `CodeEditor` and
  `QueryAutocomplete` take `aria-labelledby`, so a FormRow names them
  once. `PickerField` keeps its value in its name.

Fixed:

- In a FormRow stacked at ≤768 px, every field whose root carries
  `data-aegis-field` fills the row: `TextField` (with `NumberField` and
  `PasswordField`), `Select`, `PickerField`, `SearchInput`, `Slider`,
  `QueryAutocomplete` and `CodeEditor`. A `Checkbox` keeps its width, and
  a consumer's own field can carry the attribute too.
- `QueryAutocomplete`'s suggestion popover no longer overwrites the
  input's `aria-describedby` with its own id, so the input is described by
  what its caller passes rather than by the suggestion list.
- `niceTicks` keeps an end tick that is a multiple of the step however far
  from zero it lies (nanosecond timestamps, `123456.794` with a step of
  `0.001`), keeps ticks of steps from `1e23` up exact, and no longer
  returns duplicate ticks for a span only a few doubles wide or as wide
  as ±1e308. A step below `1e-100`, which threw, now gives the ticks of
  that step, subnormal steps included. A `count` that is not positive, or
  a step past the largest double, gives no ticks.

The inject wizard's selects, sliders and number fields are described by
their rows, and its Namespace radio group and Blast radius meter are
named once by their row labels. Install pedestal names its Helm values
editor by its row label.
