# CSS conventions

The contract every `.css` file in `packages/ui/src/` must follow (paths
below are relative to `packages/ui/`). Enforced by review and, where
mechanizable, by Prettier and Stylelint.

## 1. Tokens are the only source of visual truth

Every visual value comes from a CSS custom property in `src/styles/theme.css`.

**Banned in component CSS** (`src/components/**`, `src/layouts/**`):

- raw hex / `rgb()` / `rgba()` / named colours
- raw `px` for sizes, spacing, font-size, radius — including `1px`
  hairlines, which use `var(--size-hairline)`
- raw `ms` / `s` for transitions / animations

**Allowed exceptions**:

- `0` / `100%` / `auto` / `inherit` / `unset` — keyword-like values, not tokens
- `em` / `rem` / `%` / `vh` / `vw` / `cqi` / `fr` — these are scale-relative
  units, not raw pixels
- raw `px` _inside_ token declarations in `theme.css` (that's where the
  values live)
- raw `px` in `@media (max-width: …)` / `@media (min-width: …)`
  breakpoints — custom properties can't be used there (see §5)

If a token is missing, add it to `theme.css` first, then use it.

When a size is also needed by TypeScript layout code (e.g. the node box
that `ServiceMap` hands to dagre), the `.tsx` constant is the single
source: the component sets it as a custom property on its root element
and the CSS reads that property. Don't copy the number into a token.

### Token namespaces

| Prefix                                                     | Use for                                           |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `--bg-*`                                                   | background colours                                |
| `--text-*`                                                 | foreground / ink colours                          |
| `--border-*`                                               | borders + dividers                                |
| `--accent-*`                                               | semantic accents — anomaly red only               |
| `--ink-*`                                                  | secondary semantic (logs, cautions)               |
| `--space-*`                                                | margin / padding / gap (4 px scale)               |
| `--radius-*`                                               | border-radius                                     |
| `--size-icon-*`                                            | icon glyph sizes (12/16/20)                       |
| `--size-control-*`                                         | input/button heights (24/32)                      |
| `--size-avatar-*`                                          | avatar/dot sizes (24/32/40)                       |
| `--size-hairline`                                          | 1 px hairline borders                             |
| `--font-*`                                                 | font-family stacks                                |
| `--fs-*`                                                   | font-size (`--fs-<px>` steps plus `--fs-display`) |
| `--fw-*`                                                   | font-weight                                       |
| `--tracking-*`                                             | letter-spacing                                    |
| `--motion-*`                                               | transition / animation durations, easing, offsets |
| `--shadow-*`                                               | box-shadow                                        |
| `--z-*`                                                    | z-index scale                                     |
| `--header-height`, `--sidebar-width-*`, `--page-max-width` | layout constants                                  |
| `--{component}-*` (e.g. `--ask-panel-width`)               | sizes owned by a single component                 |

## 2. BEM naming, scoped per component

Each primitive owns one CSS class prefix; nothing else may match
selectors at that prefix.

```
.aegis-{component}                       // root
.aegis-{component}--{modifier}           // variant of root
.aegis-{component}__{element}            // child element
.aegis-{component}__{element}--{state}   // child variant
```

Examples (already in the codebase):

- `.aegis-panel` / `.aegis-panel__header` / `.aegis-panel--ghost`
- `.aegis-metric-card` / `.aegis-metric-card--inverted` / `.aegis-metric-card--clickable`
- `.aegis-shell` / `.aegis-shell__sidebar` / `.aegis-shell__nav-link--active`

No nested selectors deeper than one level. No tag selectors except inside
the root selector chain (e.g. `.aegis-panel button` is fine, `button` at
the top level is not).

No `!important`. If you reach for it, restructure.

## 3. Property order inside a rule

For consistency / diff-readability, declare properties in this order:

1. **Layout & positioning** — `position`, `inset`, `display`, `grid-*`,
   `flex-*`, `gap`, `z-index`
2. **Box model** — `width`, `height`, `margin`, `padding`, `border`,
   `border-radius`, `overflow`
3. **Typography** — `font-*`, `line-height`, `letter-spacing`,
   `text-align`, `text-transform`, `white-space`
4. **Visual** — `background`, `color`, `box-shadow`, `opacity`, `cursor`
5. **Motion** — `transition`, `animation`

Prettier doesn't enforce this; do it manually. PRs that fight the order
will be asked to fix.

## 4. State coverage required

Every interactive primitive (anything with `cursor: pointer`,
`onClick`, or `role="button"`) must define:

- `:hover` — visual feedback
- `:focus-visible` — keyboard focus ring (the global one from
  `index.css` is usually enough; override only if you need something
  different)
- `:active` — pressed state
- `[aria-disabled='true']` or `:disabled` — disabled appearance

Missing any of these is a review block.

## 5. Responsive

Breakpoints (Tailwind-aligned). There are no breakpoint tokens: custom
properties can't be used inside `@media`, so these values are written
literally in media queries.

| Name | Width   | When to use                                         |
| ---- | ------- | --------------------------------------------------- |
| sm   | 640 px  | small phones in landscape, large phones in portrait |
| md   | 768 px  | tablets                                             |
| lg   | 1024 px | small laptops                                       |
| xl   | 1280 px | desktops                                            |

Authoring style: **desktop first**. Default rules target the largest
viewport; smaller viewports are progressively constrained with
`@media (max-width: ...)` blocks. Use the breakpoint _values_ (not
custom property references — CSS doesn't allow them inside `@media`).

```css
.aegis-foo {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 768px) {
  .aegis-foo {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .aegis-foo {
    grid-template-columns: 1fr;
  }
}
```

Every primitive must render correctly at `≤640 px` width without
horizontal scroll (tables get internal horizontal scroll; everything
else fits).

## 6. Dark mode contract

Tokens come in two flavours:

```css
:root {
  --bg-page: <light value>;
  /* ... */
}

[data-theme='dark'] {
  --bg-page: <dark value>;
  /* ... */
}
```

Component CSS **never references explicit light or dark colours** — it
only references the semantic token. That's how a primitive gets dark
mode for free: every colour it uses is a `var(--bg-*)` / `var(--text-*)`
/ `var(--border-*)` reference.

Adding a new colour value? Add both light + dark to `theme.css` first.

## 7. Component-local CSS file convention

- One `.css` next to each `.tsx`, same basename: `Panel.tsx` + `Panel.css`.
- The `.tsx` imports its own `.css` (the bundler tree-shakes properly).
- No `@import` inside component CSS — only `src/index.css` does that
  (it imports `theme.css`).
- No global selectors (`body`, `html`, `*`, `:root`) in component CSS.
  Global resets live in `src/index.css` only.

## 8. No shared stylesheets

A primitive's own CSS file owns all of its styling; there are no shared
partials or utility classes. If you find yourself copying a snippet
between two component CSS files, either:

- move the repeated _value_ into a token in `theme.css`, or
- promote the repeated _pattern_ to a real primitive in
  `src/components/ui/` and compose it.

Don't duplicate.

## 9. Animation discipline

- All durations / easings come from `--motion-*` tokens.
- Respect `prefers-reduced-motion` — the global rule in `theme.css`
  already collapses animations to ~instant; don't override. It does not
  shorten delays, so an animation that holds an element hidden during a
  delay (`backwards` fill, like the `PageWrapper` stagger) must be set
  to `animation: none` under `prefers-reduced-motion: reduce`.
- No infinite loops unless meaningfully semantic (`StatusDot` pulse is
  the canonical example).

## 10. What gets enforced

Mechanical:

- **Prettier** — formatting (import order applies to TS/TSX only).
- **Stylelint** (`pnpm lint:css`, config in the root `.stylelintrc.cjs`)
  — `stylelint-config-standard` plus the token rules: `color-no-hex`,
  `color-named: never`, `unit-disallowed-list` for `px` / `ms` / `s`
  (px is exempt only in `max-width` / `min-width` media features) and a
  `unit-allowed-list` that rejects any unit not listed (`pt`, `cm`, …).
  `theme.css` and `index.css` are exempt — that's where the values live.
- **Token-discipline grep** (north-star #4 in `CLAUDE.md`) — a quick
  audit for the same rule; it should print nothing:

  ```bash
  grep -REn --include='*.css' '#[0-9a-fA-F]{3,8}\b|\b[0-9]+px\b|\b[0-9.]+m?s\b' \
    packages/ui/src/components packages/ui/src/layouts | grep -v '@media'
  ```

By review:

- BEM naming, property order, state coverage, dark-mode contract,
  duplication.
