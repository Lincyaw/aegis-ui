# CLAUDE.md

Guidance for Claude Code working in this repo. This is the **aegis-ui**
library — the shared design system + multi-app shell consumed by every
AegisLab sub-application (portal, container service, dataset manager,
RCA workbench, …).

It is a **library**, not an application. There is no API client, no Zustand
store, no business state, no router instance owned by this repo. The
playground (`src/playground/`) exists only to host the gallery and demo
apps so primitives can be developed against a real surface.

## What this repo ships

```
@OperationsPAI/aegis-ui
├── tokens               src/styles/theme.css
├── primitives           src/components/ui/*    (~30 components, plain CSS, no biz logic)
├── layouts              src/layouts/PageWrapper.tsx
├── shell (router-aware) src/layouts/shell/AegisShell.tsx
├── AntD theme           src/theme/antdTheme.ts
└── playground (private) src/playground/        (gallery + demo apps)
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
5. **Gallery** (`src/playground/Gallery.tsx`) — the live spec. If a
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
- **Anomaly red** (`--accent-warning`, `#E11D48`) is reserved for *actual*
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

| Path | Purpose |
|------|---------|
| `src/styles/theme.css` | Design tokens (CSS custom properties + keyframes) |
| `src/styles/{responsive,utility}.css` | Responsive helpers + utility classes |
| `src/styles/shared/{card,form,table}.css` | Shared structural patterns |
| `src/styles/fonts.ts` | Geist / Inter / JetBrains Mono asset imports |
| `src/components/ui/` | Primitives + their CSS, one component per file |
| `src/components/ui/index.ts` | Primitive barrel — public API of the UI kit |
| `src/layouts/PageWrapper.{tsx,css}` | Page root container |
| `src/layouts/shell/` | Router-aware shell (AegisShell, TopHeader, Sidebar, BreadcrumbBar) |
| `src/theme/antdTheme.ts` | Ant Design `ConfigProvider` mapped to our tokens |
| `src/index.ts` | Library public API barrel |
| `src/index.css` | Global reset + scrollbar + focus ring |
| `src/playground/Gallery.{tsx,css}` | Live spec — every primitive's specimen |
| `src/playground/apps/*` | Demo apps proving the shell contract |
| `src/main.tsx` | Playground entry; NOT shipped in `dist` |

## Validation gates

```bash
NPM_TOKEN=<token> pnpm install
pnpm type-check      # tsc --noEmit (strict + noUnusedLocals/Parameters)
pnpm lint            # eslint --max-warnings 0 (see strict policy below)
pnpm format:check    # prettier
pnpm build           # tsc -p tsconfig.build.json && vite build (lib mode)
pnpm dev             # local playground; eyeball the gallery + demo apps
pnpm check           # type-check + lint + format:check in one shot
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

Playground (`src/playground/**`) and `src/main.tsx` get a few rules
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

## Doing tasks

- **Prefer editing existing files**; don't create new ones unless asked.
- **Don't add abstractions beyond what the task requires.** Three similar
  lines beats a premature helper. No backwards-compatibility shims unless
  asked — just change the code.
- **Default to no comments.** Only add one when the *why* is non-obvious
  (a hidden constraint, a workaround for a specific bug). Never explain
  *what* the code does — well-named identifiers do that. Never reference
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
