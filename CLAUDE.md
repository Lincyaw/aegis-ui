# CLAUDE.md

Guidance for Claude Code working in this repo. This is the **aegis-ui**
library — the shared design system + multi-app shell consumed by every
AegisLab sub-application (portal, container service, dataset manager,
RCA workbench, …).

This is a **pnpm monorepo**:

- `packages/ui` — the published library (`@lincyaw/aegis-ui`). The
  only thing that ships to consumers.
- `apps/console` — the unified Vite app (`@lincyaw/console`,
  private). It mounts `<AegisShell>` and registers every sub-app via the
  `AegisApp[]` config. Sub-apps live under `apps/console/src/apps/` and
  are registered in `apps/console/src/registry.ts`:
  - `portal/` — the real AegisLab product (pages, api, components,
    hooks). Mounted at `basePath: '/portal'`.
  - `trajectories/` (`/trajectories`), `llmharness-review/` (`/cases`),
    `blob/` (`/blob`), `pages/` (`/pages`), `notes/` (`/notes`),
    `settings/` (`/settings`) — AegisLab tools built on the shell.
  - `gallery/` — the live spec for `packages/ui`. Mounted at
    `basePath: '/gallery'`.
  - `containers/`, `datasets/`, `env-demo/` — shell layout demos,
    registered in dev builds only.

The library (`packages/ui`) is presentational only — no API client, no
business state, no router instance. Router-aware code is confined to
`packages/ui/src/layouts/shell/` (AegisShell + the `AegisApp` contract),
`auth/RequireAuth`, and the `InboxPage` / `NotificationBell` primitives.
Anything business lives inside a sub-app in `apps/console/src/apps/`.

## What this repo ships

```
@lincyaw/aegis-ui
├── tokens               src/styles/theme.css
├── primitives           src/components/ui/*    (plain CSS, no biz logic)
├── layouts              src/layouts/PageWrapper.tsx
├── shell (router-aware) src/layouts/shell/AegisShell.tsx
├── AntD theme           src/theme/antdTheme.ts
└── (consumed by apps/console/src/apps/* — see top of this file)
```

`dist/` is the published artifact (ESM + CJS + d.ts + style.css). Consumers
do `import { Panel } from '@lincyaw/aegis-ui'` and
`import '@lincyaw/aegis-ui/style.css'` — they should never reach into
internal paths. The library does not bundle fonts: consumers import
`@fontsource-variable/geist`, `@fontsource-variable/hanken-grotesk`,
`@fontsource-variable/noto-sans-sc` and `@fontsource/google-sans-code`
(`400.css` + `500.css`) themselves (the console does this in
`apps/console/src/main.tsx`). `--font-ui` lists PingFang SC ahead of Noto
Sans SC, so Apple devices render Chinese in the system face.

## Top-down hierarchy — maintain in this order, never invert

1. **Design tokens** (`src/styles/theme.css`) — colour, type, spacing,
   motion, radius, shadow. Tokens are the only source of visual truth.
2. **Layout system** (`src/layouts/PageWrapper.tsx`) — owns `max-width`,
   `margin`, `padding`, and the staggered fade-in. Consumers compose pages
   inside `<PageWrapper>`; nobody else redefines those properties.
3. **Primitives** (`src/components/ui/`) — one `.tsx` + one `.css` per
   primitive, plain CSS, no business logic. Exported through
   `src/components/ui/index.ts` and re-exported by the root `src/index.ts`.
4. **Shell** (`src/layouts/shell/`) — TopHeader + Sidebar + BreadcrumbBar +
   route composition over `AegisApp[]`. Router-aware (peer-deps
   `react-router-dom`); presentation still comes from primitives + tokens.
5. **Gallery** (`apps/console/src/apps/gallery/`, mounted by the gallery
   sub-app) — the live spec. If a primitive isn't in the gallery, the
   team doesn't know it exists.
6. **Consumer apps** compose pages from primitives + `PageWrapper` and plug
   into `AegisShell` via the `AegisApp` contract — never reach into the
   library's internals.

## Design conventions — enforced

- **No hardcoded values** in component CSS. No raw hex, raw px, raw ms
  or s (px only as an `@media` breakpoint). Reference a CSS custom
  property from `theme.css`. If a token is missing, add it there first.
  Stylelint (`pnpm lint:css`) enforces this.
- **Surfaces and ink**: cool, very light surfaces (`--bg-page`,
  `--bg-panel`, `--bg-muted`, `--bg-tint`, `--bg-brand-soft`) and soft
  near-black ink (`--text-main`, never pure black). Dark fills appear only
  on small elements (primary button, inverted chip), never as a page or
  section background.
- **Activation = surface inversion** (`--bg-inverted` background +
  `--text-on-inverted` text). Never accent colour.
- **One brand blue** (`--accent-brand`) for brand marks, hero emphasis,
  the focus ring and the current navigation item — never status. Links use
  `--accent-info`, which shares its value.
- **Anomaly red** (`--accent-warning`, `#E11D48`) is reserved for _actual_
  anomalies — failures, breaches, alarms. Never decorative. Cautions that
  are not failures use `--ink-warn`.
- **Type stack**: Geist (`--font-brand`) for brand lockups only; Hanken
  Grotesk (`--font-ui`, `--font-numeric`) for all text and numbers, with
  Chinese falling back to PingFang SC / Noto Sans SC; Google Sans Code
  (`--font-mono`) only for ids, paths and code, never numbers. Numbers
  render with `font-variant-numeric: tabular-nums`. Sizes come from the
  `--type-<role>-size / -line / -weight / -tracking` roles (`title`,
  `heading`, `strong`, `body`, `small`, `label`, `micro`, `numeric`,
  `number`, `mono`, and `display` / `article-*` / `eyebrow` for overview
  and article pages). Chips, field labels, table headers, MetricLabel and
  StatBlock labels are never uppercase; `--tracking-label` is the tracking
  of the uppercase meta labels that SectionDivider, CodeBlock's language
  tag and similar primitives draw. No interface text is italic: emphasis
  comes from weight or ink, and only rendered Markdown keeps an author's
  `em`.
- **Line breaking**: headings take `text-wrap: balance` and prose
  `text-wrap: pretty`, so no line ends on a lone word. `index.css` sets
  both for semantic headings and paragraphs, and each primitive's title and
  description classes set them for text in other elements.
- **Radius**: `--radius-pill` for buttons, chips, segmented tabs, search
  and bars; `--radius-md` for inputs, selects and code blocks;
  `--radius-lg` for cards, panels and dialogs; `--radius-xl` for heroes
  and featured cards; `--radius-xs` / `--radius-sm` for checkboxes and
  check cells. A rounded shape inside another, less than `--space-8` from
  its edge, takes the outer radius minus that gap: menu items sit
  `--space-1` inside a `--radius-md` panel and take `--radius-sm`; a gap
  with no matching token is written `calc(var(--radius-…) - var(--space-…))`.
  When the difference is 2 px or less the inner shape keeps its own radius.
- **Borders**: a card, panel or row has a border all the way round or none.
  A one-sided hairline only divides rows or sections or marks the edge of a
  docked panel; a state such as unread or selected shows through the
  surface or a dot, never a coloured side bar.
- **Elevation and glass**: three shadows — `--shadow-rest` (cards, panels,
  secondary buttons), `--shadow-raised` (hovered clickable cards and rows,
  featured content), `--shadow-overlay` (dialogs, menus, tooltips). One
  shadow per layer; a card never nests another shadowed card. Glass
  (`--bg-glass` + `backdrop-filter: blur(var(--glass-blur))` +
  `--border-glass` + `--shadow-rest`) only on surfaces layered over
  content or the ambient wash, never on tables or body text.
- **Motion**: `--motion-*` tokens only. Every state change decelerates
  into place: the token curves decelerate and no transition names `ease`,
  `linear` or `ease-in-out`; only constant loops (spinners, shimmer, the
  carousel progress) run linear, and the ambient drift swings both ways.
  Clickable cards and buttons rise `--motion-lift` and step to
  `--shadow-raised` on hover and settle back into place when pressed;
  nothing scales or rotates; content that cannot be clicked has no hover
  effect. Overview and article surfaces add `--motion-reveal`,
  `--motion-hero`, `--motion-slide` / `--carousel-dwell` and the
  `--motion-ambient` drift. Under `prefers-reduced-motion` everything is
  instant and nothing autoplays.
- **Focus**: a `--focus-ring-width` outline in `--focus-ring-color` at
  `--focus-ring-offset`; fields show an `--accent-brand` border plus
  `--focus-halo`. Every interactive element shows it on `:focus-visible`,
  and a row or item inside a container draws it inset
  (`outline-offset: calc(-1 * var(--focus-ring-width))`); a background
  change alone is not a focus state. `AegisShell` opens with a skip link
  that moves focus past the header to `main`.
- **Spacing**: `--space-*` tokens (4 px scale). No raw padding / margin.
- **Components are presentational.** No API calls, no global store reads,
  no business state. Hosts pass props in. A viewer may load the file URL
  its host passes (`FilePreview`, `ParquetViewer`), as `<img>` and
  `<video>` do; it never knows a backend route or builds a query.
- **Every new primitive ships with a Specimen** in the gallery. PRs that
  add a primitive without a gallery entry are incomplete.
- **Primitives stay router-agnostic where possible.** `Breadcrumb`,
  `IdentityCell`, `ButtonLink` and a linked `Panel` accept a
  `linkComponent` render prop
  (type `LinkComponent`) instead of hardcoding `react-router-dom`. Only
  `layouts/shell/**`, `auth/RequireAuth`, and
  the `InboxPage` / `NotificationBell` primitives import
  `react-router-dom` directly; don't add new importers outside
  `layouts/shell/`.
- **Long documents are MDX.** Articles, reports and other long-form pages
  are written as `.mdx` files and rendered by `MdxDocument`, with
  `mdxTableOfContents` over the module's `tableOfContents` export for the
  page's `TableOfContents`. The host lists `aegisMdx()` from
  `@lincyaw/aegis-ui/vite` before `@vitejs/plugin-react` (whose `include`
  takes `.mdx`) and references `@lincyaw/aegis-ui/mdx-modules` in its
  `vite-env.d.ts`. `Markdown` stays for short text that arrives at runtime.

## AegisApp contract (for adding a sub-app)

```ts
export const myApp: AegisApp = {
  id: 'my-app',
  label: 'My App',
  icon: <SomeIcon />,
  basePath: '/my-app',
  description: 'One-line pitch shown in app pickers.',
  sidebar: [
    { items: [
      { to: '', label: 'List', end: true },
      { to: 'new', label: 'Create' },
    ]},
  ],
  routes: [
    {
      element: <AppRoot />,            // optional: holds Context provider
      children: [
        { path: '',     element: <ListPage /> },
        { path: 'new',  element: <CreatePage /> },
        { path: ':id',  element: <DetailPage /> },
      ],
    },
  ],
};
```

Mount it in the consumer:

```tsx
<BrowserRouter>
  <AegisShell brand={...} apps={[myApp, ...]} fallbackPath="/" />
</BrowserRouter>
```

The shell wraps every route in `<PageWrapper>` automatically — pages
themselves render content only, never the layout chrome.

## Where things live

| Path                                                    | Purpose                                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/styles/theme.css`                      | Design tokens (CSS custom properties + keyframes)                                                         |
| `packages/ui/src/components/ui/`                        | Primitives + their CSS, one component per file                                                            |
| `packages/ui/src/components/ui/index.ts`                | Primitive barrel — public API of the UI kit                                                               |
| `packages/ui/src/layouts/PageWrapper.{tsx,css}`         | Page root container                                                                                       |
| `packages/ui/src/layouts/shell/`                        | Router-aware shell (AegisShell, TopHeader, Sidebar, BreadcrumbBar)                                        |
| `packages/ui/src/auth/`                                 | `AuthProvider` / `useAuth` contract + `RequireAuth` route guard                                           |
| `packages/ui/src/agent/core/`                           | Agent runtime, hooks, MCP tool catalogue — below the primitives, no I/O                                   |
| `packages/ui/src/agent/chat/`                           | Agent chat contract (`AgentChatProvider`, `useAgentChat`) — below the primitives, no I/O                  |
| `packages/ui/src/agent/ask/`                            | Ask overlay/panel — above the primitives                                                                  |
| `packages/ui/src/transports/`                           | AgentM chat channel + MCP bridge client, published as `@lincyaw/aegis-ui/transports`                      |
| `packages/ui/src/theme/antdTheme.ts`                    | Ant Design `ConfigProvider` mapped to our tokens                                                          |
| `packages/ui/src/index.ts`                              | Library public API barrel                                                                                 |
| `packages/ui/src/vite.ts`                               | Build-time Vite preset (`aegisMdx`), published as `@lincyaw/aegis-ui/vite`                                |
| `packages/ui/src/index.css`                             | Global reset + scrollbar + focus ring                                                                     |
| `packages/ui/package.json`                              | Library publish config — name, version, exports                                                           |
| `packages/ui/vite.config.ts`                            | Library build (ESM + CJS + d.ts + style.css)                                                              |
| `apps/console/src/apps/gallery/`                        | Live spec — `sections/<Group>.tsx` per gallery section, `shared.tsx` / `fixtures.ts` / `columns.tsx`      |
| `apps/console/src/apps/*`                               | Sub-apps, registered with AegisShell in `apps/console/src/registry.ts`                                    |
| `apps/console/src/main.tsx`                             | Console entry (not part of the npm package)                                                               |
| `apps/console/index.html`                               | Vite HTML entry for the dev server                                                                        |
| `apps/console/{gallery-site.html,src/gallery-main.tsx}` | Standalone gallery entry for the static GitHub Pages build (`build:pages`)                                |
| `apps/console/server/`                                  | Single-binary Go server that embeds the console (see its README)                                          |
| `Dockerfile`, `scripts/deploy-frontend.sh`              | nginx image of the console + build/push/rollout script                                                    |
| `.github/workflows/`                                    | CI (`check`), npm publish (`publish`), console binary release (`release-console`), gallery site (`pages`) |
| `tsconfig.base.json`                                    | Shared strict TS settings, extended by every package                                                      |
| `pnpm-workspace.yaml`                                   | Workspace package globs                                                                                   |
| `turbo.json`                                            | Pipeline graph (build, type-check, lint, lint:css)                                                        |
| `.changeset/`                                           | Versioning + publish tracking                                                                             |

## Validation gates

```bash
pnpm install
pnpm type-check      # turbo run type-check (strict + noUnused* across packages)
pnpm lint            # turbo run lint --max-warnings 0
pnpm lint:css        # stylelint via turbo on packages/ui
pnpm format:check    # root prettier (packages, docs, scripts, workflows, root files), then the console's own prettier over apps/console/src
pnpm check:gallery   # every primitive export has a gallery specimen
pnpm check:mcp-tools # apps/console/server/mcp_tools.generated.json is up to date
pnpm build           # turbo run build (packages/ui emits dist/, console builds)
pnpm dev             # apps/console vite dev server (gallery + demo apps)
pnpm check           # type-check + lint + lint:css + format:check + check:gallery + check:mcp-tools (not build)
```

CI (`.github/workflows/check.yml`) runs `pnpm check`, then `pnpm build`,
then a smoke test of the console Go binary.

For browser runtime failures where the page renders and then turns blank, use
the repo-local Headless DevTools Debug skill:
`.agents/skills/headless-devtools-debug/SKILL.md`.

Single-package shortcuts:

```bash
pnpm -F @lincyaw/aegis-ui build     # library only
pnpm -F @lincyaw/console dev     # console only
```

A primitive is "done" only after the gallery renders cleanly in the
browser at desktop AND ≤768 px width.

## Strict-lint policy (don't water down)

The library's ESLint config (root `.eslintrc.cjs`, applied to
`packages/ui`) is intentionally maximal:

- `@typescript-eslint/recommended-type-checked` +
  `stylistic-type-checked` — all the `no-unsafe-*` /
  `no-floating-promises` / `no-misused-promises` rules are on.
- `prefer-nullish-coalescing` / `prefer-optional-chain` / `prefer-readonly`
  / `switch-exhaustiveness-check` / `no-unnecessary-condition`.
- `consistent-type-imports` + `consistent-type-exports` (use
  `import type` / `import { type X }`).
- `array-type` set to `array-simple` — primitive arrays may use `T[]`,
  complex types must use `Array<T>` (eslint-fix handles this).
- React: `jsx-no-useless-fragment`, `self-closing-comp`,
  `jsx-no-bind` (warn).
- a11y baseline: `jsx-a11y/recommended`.
- `import/no-cycle` / `no-duplicate-imports` /
  `unused-imports/no-unused-imports`.
- `no-console` allows only `warn` / `error`.
- `curly: ['error', 'all']` — every `if` gets braces.

The console has its own, looser config in `apps/console/.eslintrc.cjs`
(the root config ignores `apps/console/`). It extends
`@typescript-eslint/recommended` without the type-checked presets and
without `jsx-a11y`, and adds: `no-explicit-any` and
`no-non-null-assertion` as errors, `consistent-type-imports`,
`array-type: array-simple`, `naming-convention`,
`react-hooks/exhaustive-deps` as an error, `no-console` (only `warn` /
`error` allowed), and a `no-restricted-syntax` ban on antd's static
`Modal.confirm` / `message.*` / `notification.*` APIs (use
`App.useApp()` so dark mode applies). It runs with `--max-warnings 0`,
so warnings fail too. Library code stays on the strict root config.

**When you hit a lint error**: fix the code, don't disable the rule.
Per-line `eslint-disable` comments require a justification on the next
line.

## Husky + commitlint

- Pre-commit: `lint-staged` runs ESLint + Prettier (and Stylelint for
  CSS) on staged files outside `apps/console/`. Console files are not
  touched by the hook; `pnpm check` covers them.
- Commit message: `commitlint` enforces conventional-commits
  (`feat:` / `fix:` / `chore:` / `refactor:` / …).

If a hook blocks you, fix the underlying issue. Don't pass `--no-verify`
unless explicitly asked by a human.

## Releasing the library

`@lincyaw/aegis-ui` is versioned with changesets and published by CI,
never from a local checkout:

1. With any consumer-visible change, run `pnpm changeset` and commit the
   generated `.changeset/*.md` alongside the change.
2. To cut a release, run `pnpm changeset version` (bumps
   `packages/ui/package.json`, writes the CHANGELOGs, consumes the
   changesets) and commit the result as `chore(release): v<version>`.
3. Tag that commit `v<version>` — it must match the version in
   `packages/ui/package.json` — and push the tag
   (`git push origin v<version>`).
4. The `publish` workflow verifies the tag against
   `packages/ui/package.json`, runs `pnpm check`, builds the library and
   runs `npm publish --access public --provenance` from `packages/ui`.
   npm authenticates through Trusted Publishing, falling back to the
   `NPM_TOKEN` secret.

The console binary is released separately with `console-v*` tags (see
`apps/console/server/README.md`).

## First principle — fix the library before the page

When a page-level UI defect surfaces, **the default response is to fix
the primitive in `packages/ui`, not to patch the page.** Pages compose
primitives; if the primitive is wrong, every page that uses it is
wrong, and page-level workarounds accumulate as silent tech debt.

Apply this concretely:

1. When you see a UI defect, ask first: _is this a primitive bug?_
   Look in `packages/ui/src/components/ui/` or `packages/ui/src/layouts/`
   before editing the page.
2. If the primitive is missing a knob, add the knob to the primitive,
   update its specimen in its gallery section, and verify in both themes. Then
   use it from the page.
3. Never use raw antd components without going through `getAegisTheme`.
   If a token is missing for an antd component in dark mode, add it in
   `antdTheme.ts` so every page benefits.
4. Test every UI change in **light + dark** at **desktop + ≤768 px**.
   A primitive is "done" only after the gallery renders cleanly in all
   four combinations.

When in doubt: invest in the foundation, not the symptom.

## Doing tasks

- **Prefer editing existing files**; don't create new ones unless asked.
- **Don't add abstractions beyond what the task requires.** Three similar
  lines beats a premature helper. No backwards-compatibility shims unless
  asked — just change the code.
- **Default to no comments.** Only add one when the _why_ is non-obvious
  (a hidden constraint, a workaround for a specific bug). Never explain
  _what_ the code does — well-named identifiers do that. Never reference
  the current task / PR / caller ("added for the X flow") — that belongs
  in the commit message.
- **Trust internal code; validate only at boundaries.** No defensive
  nil-checks on values we just constructed.
- **Code is the source of truth.** When code, tests, and docs disagree:
  code wins. Update tests and docs to match, never the other way around.

## Cross-repo coupling

- The aegis-ui is consumed by `AegisLab-frontend` (the portal). When you
  change a primitive's API or rename an export, the portal's build will
  break — coordinate the bump there.
- This repo is **independent of the aegis monorepo**. It does not link
  to `../AegisLab/project-index.yaml` and does not share the aegis
  skills directory.
- Published to npmjs.org under the public `@lincyaw` scope — no auth
  needed for install.

<!-- auto-harness:begin -->

## Core principles

Three axioms govern all work. Fall back to these when a skill's instructions don't cover a situation:

1. **Quality over quantity** — a few things done well beats many done poorly. Applies to tests, observations, skills, code, docs, experiments, ideas. If you can't say why each item exists, there are too many.
2. **Surface problems early** — fail fast, validate before investing, outline before drafting. Never hide complexity to make something look simpler.
3. **Deliberate execution** — every decision traceable to a reason. Understand before acting; validate manually before automating; measure before optimizing; consider removing before adding.

Full text: `/home/ddq/.claude/plugins/cache/autoharness/autoharness/1.1.3/references/principles.md`.

## North-star targets

1. **Design language coherence across sub-apps** (Primary) — every page in `apps/console/src/apps/*` is composed only of `@lincyaw/aegis-ui` primitives + `PageWrapper`; no page-local re-implementation of primitives, no raw antd component without going through `getAegisTheme`.
   Measure: agent review on every page-touching change. Compare new pages against the gallery's primitive inventory and the "First principle" section.
   Mechanism: **agent**. Baseline: judged per change by review.

2. **Gallery specimen coverage = 100%** — every export from `packages/ui/src/components/ui/index.ts`, plus the UI component exports of `packages/ui/src/agent/index.ts`, has a live specimen in the gallery (`apps/console/src/apps/gallery/sections/*.tsx`).
   Measure: `pnpm check:gallery` (runs `scripts/check-gallery-coverage.mjs` — parses both barrels, walks every `<SectionDivider>…</SectionDivider>` block including multi-line dividers and ones carrying an `extra={…}` prop, exits non-zero with the missing-primitive list when coverage < 100%). Also runs as part of `pnpm check`.
   Mechanism: **script** + **agent** confirmation (visual review in `pnpm dev` that the specimen actually renders the variants worth shipping, not just an empty placeholder). Baseline: measure with `pnpm check:gallery`.

3. **All CI gates green** — `pnpm check` (type-check + lint + lint:css + format:check + check:gallery + check:mcp-tools) and `pnpm build` both exit 0.
   Measure: `pnpm check && pnpm build`
   Mechanism: **script**. Baseline: measure with the command.

4. **Token discipline** — zero raw hex / raw px / raw ms / raw s inside `packages/ui/src/components/**/*.css` and `packages/ui/src/layouts/**/*.css` (`packages/ui/src/styles/**` is the token home and is excluded). px is allowed only as an `@media` breakpoint.
   Measure: `grep -REn --include='*.css' '#[0-9a-fA-F]{3,8}\b|\b[0-9]+px\b|\b[0-9.]+m?s\b' packages/ui/src/components packages/ui/src/layouts | grep -v '@media'` — target is no output.
   Mechanism: **script** — Stylelint enforces it in `pnpm lint:css` (`color-no-hex`, `color-named`, `unit-disallowed-list` for px / ms / s outside media queries); the grep is a quick audit. Baseline: measure with the command.

5. **Justified `eslint-disable` only** — every `eslint-disable` line is followed by a justification comment on the next line, per CLAUDE.md strict-lint policy.
   Measure: `grep -REn 'eslint-disable' packages/ui/src apps/console/src` and audit each hit has a justification above/below.
   Mechanism: **script** (locate) + **agent** (judge justification). Baseline: measure with the command.

6. **Dual-theme + responsive parity** — every primitive specimen and sub-app page renders cleanly in **light + dark** at **desktop + ≤768 px**.
   Measure: open `pnpm dev` → toggle `ThemeToggle` → resize.
   Mechanism: **agent** (browser check on UI work). Baseline: checked in the browser on each UI change.

Secondary tiebreaker: **fix the primitive before the page** — see "First principle — fix the library before the page" section above. When a target conflicts with this principle, the principle wins.

## Dev-loop stages

| Stage        | Command                                                                                      | Notes                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Type check   | `pnpm type-check`                                                                            | Run after every TS change                                                                                                 |
| Lint         | `pnpm lint`                                                                                  | ESLint `--max-warnings 0` enforced                                                                                        |
| Lint CSS     | `pnpm lint:css`                                                                              | Stylelint over `packages/ui/src/**/*.css`                                                                                 |
| Format       | `pnpm format:check`                                                                          | Prettier (root config, then the console's) — fix with `pnpm format`                                                       |
| Build        | `pnpm build`                                                                                 | turbo: emits `packages/ui/dist/` ESM + CJS + d.ts + style.css                                                             |
| Full gate    | `pnpm check`                                                                                 | type-check + lint + lint:css + format:check + check:gallery + check:mcp-tools; run (plus `pnpm build`) before commit + PR |
| Dev server   | `pnpm dev`                                                                                   | apps/console at `:3323` — use for dual-theme + responsive checks                                                          |
| Measure NS#2 | `pnpm check:gallery`                                                                         | Gallery specimen coverage (also folded into `pnpm check`)                                                                 |
| Measure NS#4 | see north-star target 4                                                                      | Token discipline grep                                                                                                     |
| Bundle size  | `pnpm -F @lincyaw/aegis-ui build && du -cb packages/ui/dist/*.js packages/ui/dist/style.css` | Compare before/after primitive changes                                                                                    |

No unit-test runner is configured. Visual verification in `pnpm dev` is the testing substrate for primitives; type-check + lint + build catch correctness regressions.

## Iteration tracking

- Progress log: not used — short in-session loops, work is tracked via git commits + the AskUserQuestion / plan-mode flow.
- Decision log: not used — `long-horizon` not activated. Significant decisions land in commit messages or in this file.

## Project conventions

(See the hand-written sections above for full detail. Conventions enforced by this configuration:)

- **Primitive-before-page**: see "First principle — fix the library before the page".
- **Token-first CSS**: no raw hex / px / ms / s in component or layout CSS (px only as an `@media` breakpoint; enforced by Stylelint) — reference `--*` tokens from `packages/ui/src/styles/theme.css`. Add a token there before using a new value.
- **Every primitive ships a Gallery specimen**: PR is incomplete without one.
- **Antd via `getAegisTheme(scheme)`**: never use raw antd directly without the scheme-aware ConfigProvider; if a token is missing for an antd component in dark mode, fix `antdTheme.ts`, not the page.
- **Conventional commits**: enforced by commitlint via husky pre-commit. `--no-verify` only with explicit user approval.
- **Strict lint never relaxed**: fix code, don't disable rules. Per-line `eslint-disable` requires a justification comment.
- **Cross-repo coupling**: changing a primitive's API requires coordinating the bump in `AegisLab-frontend` (the portal consumer).

## Active skills

- `/autoharness:guide` — read-only methodology briefing at session start
- `/autoharness:dev-loop` — full implement → test → measure → keep/discard cycle, aligned with `pnpm check`
- `/autoharness:north-star` — define and track the targets above

<!-- auto-harness:end -->
