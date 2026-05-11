# CSS conventions

The contract every `.css` file in `src/` must follow. Enforced by review
and (where mechanizable) by ESLint / Prettier / Stylelint.

## 1. Tokens are the only source of visual truth

Every visual value comes from a CSS custom property in `src/styles/theme.css`.

**Banned in component CSS** (`src/components/**`, `src/layouts/**`):

- raw hex / `rgb()` / `rgba()` / named colours
- raw `px` for sizes, spacing, font-size, radius
- raw `ms` / `s` for transitions / animations

**Allowed exceptions**:

- `0` / `100%` / `auto` / `inherit` / `unset` — keyword-like values, not tokens
- `1px` borders may use `var(--size-hairline)`; raw `1px` is acceptable
  *only* if explicitly hair-line for visual rendering reasons (rare)
- `em` / `rem` / `%` / `vh` / `vw` / `fr` — these are scale-relative
  units, not raw pixels
- raw `px` *inside* token declarations in `theme.css` (that's where the
  values live)

If a token is missing, add it to `theme.css` first, then use it.

### Token namespaces

| Prefix | Use for |
|---|---|
| `--bg-*` | background colours |
| `--text-*` | foreground / ink colours |
| `--border-*` | borders + dividers |
| `--accent-*` | semantic accents — anomaly red only |
| `--ink-*` | secondary semantic (logs, cautions) |
| `--space-*` | margin / padding / gap (4 px scale) |
| `--radius-*` | border-radius |
| `--size-icon-*` | icon glyph sizes (12/16/20) |
| `--size-control-*` | input/button heights (24/32/40) |
| `--size-avatar-*` | avatar/dot sizes (24/32/40) |
| `--size-hairline` | 1 px hairline borders |
| `--font-*` | font-family stacks |
| `--fs-*` | font-size (9/10/11/13/16/18/24/42) |
| `--fw-*` | font-weight |
| `--tracking-*` | letter-spacing |
| `--motion-*` | transition / animation durations + easing |
| `--shadow-*` | box-shadow |
| `--z-*` | z-index scale |
| `--header-height`, `--sidebar-width-*`, `--page-max-width` | layout constants |
| `--bp-*` | breakpoint reference values |

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

Breakpoints (Tailwind-aligned):

| Token | Min width | When to use |
|---|---|---|
| `--bp-sm` | 640 px | small phones in landscape, large phones in portrait |
| `--bp-md` | 768 px | tablets |
| `--bp-lg` | 1024 px | small laptops |
| `--bp-xl` | 1280 px | desktops |

Authoring style: **desktop first**. Default rules target the largest
viewport; smaller viewports are progressively constrained with
`@media (max-width: ...)` blocks. Use the breakpoint *values* (not
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
- No `@import` inside component CSS — only `theme.css` does that.
- No global selectors (`body`, `html`, `*`, `:root`) in component CSS.
  Global resets live in `src/index.css` only.

## 8. What goes in shared CSS vs component CSS

Shared partials in `src/styles/shared/` exist for *structural* patterns
that span many components (forms, tables, cards). A primitive's own CSS
file owns its specific styling.

If you find yourself copying a snippet between two component CSS files,
either:
- extract it to `src/styles/shared/` as a `.aegis-shared-*` class, or
- promote it to a real primitive in `src/components/ui/`.

Don't duplicate.

## 9. Animation discipline

- All durations / easings come from `--motion-*` tokens.
- Respect `prefers-reduced-motion` — the global rule in `theme.css`
  already collapses animations to ~instant; don't override.
- No infinite loops unless meaningfully semantic (`StatusDot` pulse is
  the canonical example).

## 10. What gets enforced

Mechanical:
- **ESLint** — JS/TSX only.
- **Prettier** — formatting + import order in JS/TSX/CSS.
- **Stylelint** — colour / unit allowlist (re-enabled after the legacy
  raw-value sweep lands; see Phase 3 in the design-system roadmap).

By review:
- BEM naming, property order, state coverage, dark-mode contract,
  shared-vs-component scope decisions.
