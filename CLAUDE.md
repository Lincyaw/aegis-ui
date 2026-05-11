# CLAUDE.md

Guidance for Claude Code working in this repo. This is the **aegis-ui**
library — the shared design system + multi-app shell consumed by every
AegisLab sub-application (portal, container service, dataset manager,
RCA workbench, …).

This is a **pnpm monorepo**:

- `packages/ui` — the published library (`@OperationsPAI/aegis-ui`). The
  only thing that ships to consumers.
- `apps/console` — the unified Vite app (`@OperationsPAI/console`,
  private). It mounts `<AegisShell>` and registers every sub-app via the
  `AegisApp[]` config. Sub-apps live under `apps/console/src/apps/`
  (portal, gallery, …). Currently:
  - `apps/console/src/apps/portal/` — the real AegisLab product (pages,
    api, components, hooks). Mounted at `basePath: '/'`.
  - `apps/console/src/apps/gallery/` — the live spec for `packages/ui`.
    Mounted at `basePath: '/gallery'`.

The library (`packages/ui`) is presentational only — no API client, no
business state, no router instance. Anything router-aware that's
reusable lives in `packages/ui/src/layouts/shell/` (AegisShell + the
`AegisApp` contract). Anything business lives inside a sub-app in
`apps/console/src/apps/`.

## What this repo ships

```
@OperationsPAI/aegis-ui
├── tokens               src/styles/theme.css
├── primitives           src/components/ui/*    (~30 components, plain CSS, no biz logic)
├── layouts              src/layouts/PageWrapper.tsx
├── shell (router-aware) src/layouts/shell/AegisShell.tsx
├── AntD theme           src/theme/antdTheme.ts
└── (consumed by apps/console/src/apps/* — see top of this file)
```

`dist/` is the published artifact (ESM + CJS + d.ts + style.css). Consumers
do `import { Panel } from '@OperationsPAI/aegis-ui'` and
`import '@OperationsPAI/aegis-ui/style.css'` — they should never reach into
internal paths.

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
5. **Gallery** (`src/Gallery.tsx`) — the live spec. If a
   primitive isn't in the gallery, the team doesn't know it exists.
6. **Consumer apps** compose pages from primitives + `PageWrapper` and plug
   into `AegisShell` via the `AegisApp` contract — never reach into the
   library's internals.

## Design conventions — enforced

- **No hardcoded values** in component CSS. No raw hex, raw px, raw ms.
  Reference a CSS custom property from `theme.css`. If a token is missing,
  add it there first.
- **Activation = surface inversion** (`--bg-inverted` background +
  `--text-on-inverted` text). Never accent colour.
- **Anomaly red** (`--accent-warning`, `#E11D48`) is reserved for _actual_
  anomalies — failures, breaches, alarms. Never decorative.
- **Type stack**: brand (Geist) for titles, UI (Inter) for body, data
  (JetBrains Mono) for numbers / IDs / parameters. Use `--font-*` tokens.
- **Spacing**: `--space-*` tokens (4 px scale). No raw padding / margin.
- **Components are presentational.** No API calls, no global store reads,
  no business state. Hosts pass props in.
- **Every new primitive ships with a Specimen** in the gallery. PRs that
  add a primitive without a gallery entry are incomplete.
- **Shell stays router-agnostic where possible.** `Breadcrumb` accepts a
  `linkComponent` render prop instead of hardcoding `react-router-dom`.
  Only `AegisShell` / `Sidebar` / `TopHeader` are allowed to import
  `react-router-dom` directly.

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

| Path                                                  | Purpose                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `packages/ui/src/styles/theme.css`                    | Design tokens (CSS custom properties + keyframes)                                   |
| `packages/ui/src/styles/{responsive,utility}.css`     | Responsive helpers + utility classes                                                |
| `packages/ui/src/styles/shared/{card,form,table}.css` | Shared structural patterns                                                          |
| `packages/ui/src/styles/fonts.ts`                     | Geist / Inter / JetBrains Mono asset imports                                        |
| `packages/ui/src/components/ui/`                      | Primitives + their CSS, one component per file                                      |
| `packages/ui/src/components/ui/index.ts`              | Primitive barrel — public API of the UI kit                                         |
| `packages/ui/src/layouts/PageWrapper.{tsx,css}`       | Page root container                                                                 |
| `packages/ui/src/layouts/shell/`                      | Router-aware shell (AegisShell, TopHeader, Sidebar, BreadcrumbBar)                  |
| `packages/ui/src/theme/antdTheme.ts`                  | Ant Design `ConfigProvider` mapped to our tokens                                    |
| `packages/ui/src/index.ts`                            | Library public API barrel                                                           |
| `packages/ui/src/index.css`                           | Global reset + scrollbar + focus ring                                               |
| `packages/ui/package.json`                            | Library publish config — name, version, exports                                     |
| `packages/ui/vite.config.ts`                          | Library build (ESM + CJS + d.ts + style.css)                                        |
| `apps/console/src/Gallery.{tsx,css}`                  | Live spec — every primitive's specimen                                              |
| `apps/console/src/apps/*`                             | Sub-apps registered with AegisShell (portal, gallery)                               |
| `apps/console/src/main.tsx`                           | Console entry; NOT shipped                                                          |
| `apps/console/index.html`                             | Vite HTML entry for the dev server                                                  |
| `apps/portal/`                                        | AegisLab portal (`rcabench-frontend`) — shallow-integrated, owns its own UI for now |
| `tsconfig.base.json`                                  | Shared strict TS settings, extended by every package                                |
| `pnpm-workspace.yaml`                                 | Workspace package globs                                                             |
| `turbo.json`                                          | Pipeline graph (build, type-check, lint, lint:css)                                  |
| `.changeset/`                                         | Versioning + publish tracking                                                       |

## Validation gates

```bash
NPM_TOKEN=<token> pnpm install
pnpm type-check      # turbo run type-check (strict + noUnused* across packages)
pnpm lint            # turbo run lint --max-warnings 0
pnpm lint:css        # stylelint via turbo on packages/ui
pnpm format:check    # prettier across packages + apps
pnpm build           # turbo run build (packages/ui emits dist/, console builds)
pnpm dev             # apps/console vite dev server (gallery + demo apps)
pnpm check           # type-check + lint + lint:css + format:check in one shot
```

Single-package shortcuts:

```bash
pnpm -F @OperationsPAI/aegis-ui build     # library only
pnpm -F @OperationsPAI/console dev     # console only
```

A primitive is "done" only after the gallery renders cleanly in the
browser at desktop AND ≤768 px width.

## Strict-lint policy (don't water down)

The ESLint config is intentionally maximal:

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

Console (`apps/console/src/**`) gets a few rules
relaxed (`react-refresh/only-export-components`, `no-console`,
`jsx-a11y/label-has-associated-control` for specimen markup). Library
code does not.

**When you hit a lint error**: fix the code, don't disable the rule.
Per-line `eslint-disable` comments require a justification on the next
line.

## Husky + commitlint

- Pre-commit: `lint-staged` runs ESLint + Prettier on staged files.
- Commit message: `commitlint` enforces conventional-commits
  (`feat:` / `fix:` / `chore:` / `refactor:` / …).

If a hook blocks you, fix the underlying issue. Don't pass `--no-verify`
unless explicitly asked by a human.

## First principle — fix the library before the page

**This is the most important rule in this repo. Read it before every task.**

When a page-level problem surfaces (overflow, broken dark mode, raw antd
component with no theme, ad-hoc CSS to "make it look right"), the
**default response is to fix the primitive in `packages/ui`, not to
patch the page.** Pages compose primitives — if the primitive is wrong,
every page that uses it is wrong, and the patches accumulate as silent
tech debt.

**Lessons learned (do not repeat):**

1. **DataTable shipped without proper width / truncate / resize controls.**
   Action columns overflowed the panel because the only knob was
   `width: string` on a `table-layout: auto` table, and every cell was
   forced into a single `overflow: hidden; max-width: 0` mould that
   clipped buttons and chips. Fix was in the primitive (per-column
   `width` / `minWidth` / `truncate` / `resizable`, `<colgroup>` +
   `table-layout: fixed`, inner cell wrapper), not in the page. Any
   page-level CSS workaround would have masked the bug for every future
   table.

2. **`aegisTheme` was a single hardcoded light palette.** The dark-mode
   toggle existed (`ThemeProvider` + `data-theme='dark'` on root), but
   `aegisTheme` baked `colorText:#000`, `colorBgContainer:#fff`,
   `Drawer.colorBgElevated:#fff` etc. Applying `darkAlgorithm` couldn't
   undo our explicit overrides → black "Edit" button on dark surface,
   white Modal on dark page. The fix was `getAegisTheme(scheme)` that
   returns scheme-aware tokens; the page didn't need to change. Any
   "just hardcode dark colours on this Modal" patch would have been
   another scar.

**The rule (read before writing code):**

1. When you see a UI defect, ask first: _is this a primitive bug?_
   Search for the primitive's source in `packages/ui/src/components/ui/`
   or `packages/ui/src/layouts/` before you touch the page.
2. If the primitive is missing a knob, **add the knob to the
   primitive**, update its specimen in `Gallery.tsx`, and verify it in
   both themes. Then use it from the page.
3. Never use raw antd components without going through `getAegisTheme`.
   If a token is missing for an antd component in dark mode, add it to
   `antdTheme.ts` so every page benefits.
4. Never use raw hex / px / ms in component CSS — reference a token
   from `theme.css`. If a token is missing, add it there first. See
   "Design conventions — enforced" below.
5. Test every UI change in **both light and dark**, at **desktop and
   ≤768 px**. A primitive is "done" only after the gallery renders
   cleanly in all four combinations.
6. User says "fix this page" → fix the primitive first, then the page
   automatically gets the fix. Resist the temptation to ship the
   page-level patch and "come back to the primitive later." You won't.

When in doubt: **invest in the foundation, not the symptom.**

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
- Published to GitHub Packages under `@OperationsPAI` scope. `.npmrc`
  reads `${NPM_TOKEN}` for both install and publish.
