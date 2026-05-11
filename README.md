# @OperationsPAI/aegis-ui

The shared design system + multi-app shell for every AegisLab portal.
One visual language, one navigation chrome, many independent sub-apps.

---

## Positioning

`aegis-ui` is a **library**, not an application. It ships:

- **Design tokens** (colour, type, spacing, motion, radius, shadow)
- **Primitives** — ~30 router-agnostic, presentational React components
- **Layouts** — `PageWrapper` for page roots
- **Shell** — `AegisShell`: top header, two-section sidebar, auto
  breadcrumb, and route composition over an `AegisApp[]` contract
- **AntD theme** — `ConfigProvider` mapping wired to the tokens

What it does **not** ship: API clients, Zustand stores, business pages,
auth flows, request interceptors. Consumers own all of that.

The architectural model is "**Alibaba Cloud Console**": one portal frame
hosts many independent sub-applications (Containers, Datasets,
Experiments, Observability, …), each with its own routes and business
logic but a single shared visual identity.

## Motivation

We expect 7–10 AegisLab sub-applications over the next year. Without a
shared library:

- Each app re-implements the same `Panel` / `DataTable` / sidebar /
  breadcrumb 7× with subtle drift.
- The design language fragments — one app's "active state" is blue,
  another's is bold, another's is an outline.
- Cross-app navigation is impossible because nobody owns the chrome.
- Any token change (typography, spacing) requires N coordinated PRs.

A separate repo (rather than `packages/ui` inside the portal) is the
right call because:

1. **Multiple consumers, decoupled cadence** — sub-apps will live in
   their own repos and pin their own `aegis-ui` version. Lockstep with
   the portal monorepo would force every consumer to track unrelated
   churn.
2. **Forces a real public API** — anything that's not exported through
   `src/index.ts` is invisible. No "I'll just reach into
   `internal/Foo.tsx`" shortcuts.
3. **Versioning + changelog hygiene** — breaking changes get a major
   bump and a written note, not a silent rename in someone else's PR.
4. **Gallery as spec** — the playground (`pnpm dev`) is the single
   place to evaluate visual changes without spinning up any backend.

## Use

Install (GitHub Packages — see [.npmrc setup](#consumer-npmrc-setup)):

```bash
NPM_TOKEN=<your_github_token> pnpm add @OperationsPAI/aegis-ui
```

### Composing a page

```tsx
import { PageWrapper, PageHeader, Panel, DataTable } from '@OperationsPAI/aegis-ui';
import '@OperationsPAI/aegis-ui/style.css';

export default function ContainersPage() {
  return (
    <PageWrapper>
      <PageHeader title="Containers" />
      <Panel>
        <DataTable columns={...} data={...} rowKey={(r) => r.id} />
      </Panel>
    </PageWrapper>
  );
}
```

### Wiring the AntD theme

```tsx
import { ConfigProvider } from 'antd';
import { aegisTheme } from '@OperationsPAI/aegis-ui';

<ConfigProvider theme={aegisTheme}>
  <App />
</ConfigProvider>
```

### Building a multi-app portal

```tsx
import { BrowserRouter } from 'react-router-dom';
import { AegisShell, type AegisApp } from '@OperationsPAI/aegis-ui';
import '@OperationsPAI/aegis-ui/style.css';

const containersApp: AegisApp = {
  id: 'containers',
  label: 'Containers',
  icon: <HddOutlined />,
  basePath: '/containers',
  sidebar: [{ items: [{ to: '', label: 'List', end: true }, { to: 'new', label: 'Create' }] }],
  routes: [
    { element: <ContainersRoot />, children: [
      { path: '',     element: <ContainerList /> },
      { path: 'new',  element: <ContainerCreate /> },
      { path: ':id',  element: <ContainerDetail /> },
    ]},
  ],
};

<BrowserRouter>
  <AegisShell
    brand={{ name: 'AegisLab', href: '/' }}
    apps={[containersApp, datasetsApp, observabilityApp]}
    fallbackPath="/containers"
    user={{ name: 'me', menu: [...] }}
  />
</BrowserRouter>
```

The shell wraps every routed page in `<PageWrapper>` automatically — the
app's pages render content only, never the layout chrome.

The playground (`src/playground/`) contains a working example with three
apps (gallery + containers + datasets); run `pnpm dev` to see it.

## Develop

```bash
NPM_TOKEN=<token> pnpm install
pnpm dev              # local playground on http://localhost:3100
pnpm type-check       # tsc --noEmit, strict mode
pnpm lint             # eslint --max-warnings 0
pnpm format:check     # prettier
pnpm check            # type-check + lint + format:check
pnpm build            # emits dist/{index.js,index.cjs,index.d.ts,style.css}
```

## Management

### What goes into this repo

In:

- A new primitive that is **presentational only** and would otherwise be
  re-implemented in ≥2 sub-apps.
- A new layout pattern owned by all consumers (page shell variations,
  side-panel patterns, …).
- A token (`--space-*`, `--accent-*`, `--font-*`) used by ≥2 primitives.
- Shell improvements (sidebar collapsing, app switcher, breadcrumb
  overrides, …).
- AntD theme adjustments aligned with the token system.

Out (belongs in a consumer repo):

- API clients, SDK wrappers.
- Business state (Zustand / Redux / Context owning domain data).
- Pages that map 1:1 to a backend resource.
- Anything that imports from a specific consumer's source tree.

### Design conventions — enforced

- **No hardcoded values** in component CSS. No raw hex / px / ms — all
  visual values reference a CSS custom property from `src/styles/theme.css`.
- **Activation = surface inversion** (`--bg-inverted`), never accent
  colour.
- **Anomaly red** (`--accent-warning`, `#E11D48`) is reserved for real
  anomalies (failures, breaches, alarms). Never decorative.
- **Type stack**: Geist (brand titles), Inter (UI body), JetBrains Mono
  (data / IDs / numbers). Use the `--font-*` tokens.
- **Components are presentational.** No API calls, no global state reads,
  no business logic.
- **Every new primitive ships with a Specimen** in the gallery.

### Adding or changing a primitive

1. Add `src/components/ui/MyThing.tsx` + `MyThing.css`.
2. Export from `src/components/ui/index.ts`.
3. Add a specimen to `src/playground/Gallery.tsx` covering states + edge
   cases. **A primitive without a gallery entry is incomplete.**
4. `pnpm check` must pass (strict TS + ESLint `--max-warnings 0`).
5. `pnpm build` must emit a working `dist/`.
6. Eyeball the playground at desktop + ≤768 px width.

Breaking the public API (renames, removed exports, props signature
changes) requires a **major** version bump and a note in the PR
describing the migration step for the consumer.

### Versioning

- **Semver.**
  - `patch` — bugfix, internal-only refactor, doc/comment changes.
  - `minor` — new primitive, new prop with a safe default, new token.
  - `major` — any change to the public API of an exported symbol,
    renamed token, dropped peer-dep range, or changed CSS contract that
    consumers might rely on.
- The `dist/` is published to **GitHub Packages** under the
  `@OperationsPAI` scope. The version in `package.json` is the source of
  truth; CI publishes on tag (workflow lands in a follow-up PR).

### Commit + branch policy

- Conventional commits enforced by `commitlint`. Prefixes:
  `feat:` / `fix:` / `refactor:` / `chore:` / `docs:` / `test:`.
- Husky pre-commit runs `lint-staged` (ESLint + Prettier).
- Husky commit-msg validates the header.
- Don't pass `--no-verify` unless a human asks. Fix the underlying issue.

### Consumer .npmrc setup

```ini
@OperationsPAI:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

The `NPM_TOKEN` needs `read:packages` for install, plus
`write:packages` for publish.

## Repo map

| Path | Purpose |
|------|---------|
| `src/styles/theme.css` | Design tokens — the only source of visual truth |
| `src/styles/{responsive,utility}.css` | Responsive + utility helpers |
| `src/styles/shared/{card,form,table}.css` | Shared structural CSS |
| `src/styles/fonts.ts` | Geist / Inter / JetBrains Mono imports |
| `src/components/ui/` | Primitives, one `.tsx`+`.css` per component |
| `src/components/ui/index.ts` | Primitive barrel |
| `src/layouts/PageWrapper.{tsx,css}` | Page root container |
| `src/layouts/shell/` | AegisShell, TopHeader, Sidebar, BreadcrumbBar |
| `src/theme/antdTheme.ts` | AntD `ConfigProvider` theme |
| `src/index.ts` | Library public API (the only entry point) |
| `src/index.css` | Global reset + scrollbar + focus ring |
| `src/playground/` | Gallery + demo apps; NOT shipped in `dist/` |
| `CLAUDE.md` | Working guidelines for Claude Code agents in this repo |

## Related

- **AegisLab-frontend** — the current portal application; first consumer
  of this library.
- **issue #396** (in `OperationsPAI/aegis`) — the original RFC that
  motivated this split.
