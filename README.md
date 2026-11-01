# aegis-ui

Design system and multi-app shell for AegisLab front ends, published to npm
as [`@lincyaw/aegis-ui`](https://www.npmjs.com/package/@lincyaw/aegis-ui).

The package gives every AegisLab sub-application the same tokens,
components and navigation chrome. It is presentational only: it ships no API
clients, no business state and no pages. Each application brings its own data
and plugs into the shell through the `AegisApp` contract.

## Contents

| Area                 | What it provides                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Design tokens        | CSS custom properties for colour, type, spacing, radius, shadow and motion, with light and dark values                                 |
| Primitives           | Presentational React components: panels, tables, forms, charts, code and diff viewers, trace and trajectory views, chat, file browsers |
| `PageWrapper`        | Page root that owns width, padding and the entry animation                                                                             |
| `AegisShell`         | Router-aware chrome (header, sidebar, breadcrumb, app switcher) composed from an `AegisApp[]` list                                     |
| Theming              | `ThemeProvider` (light, dark, system) and `getAegisTheme(scheme)` for the Ant Design `ConfigProvider`                                  |
| Context contracts    | Auth, notifications, command palette and agent providers; the host supplies the implementation                                         |
| Agent-native runtime | `useAegisAction`, `useAegisSurface`, `AskPanel` and related types; see [docs/agent-native-ui.md](docs/agent-native-ui.md)              |
| Headless helpers     | Relative time-range parsing and a Lucene-to-SQL compiler used by the query components                                                  |

The live catalogue of every component is the gallery, published at
<https://profile.aoyangfang.top/aegis-ui/>. Locally, run `pnpm dev` and open
<http://localhost:3323/gallery>; `pnpm -F @lincyaw/console build:pages` builds
the static version that the `pages` workflow deploys.

## Install

```bash
pnpm add @lincyaw/aegis-ui
```

Peer dependencies:

| Package             | Version |
| ------------------- | ------- |
| `react`             | 18      |
| `react-dom`         | 18      |
| `react-router-dom`  | 6       |
| `antd`              | 5.25+   |
| `@ant-design/icons` | 5       |

The type tokens use Geist (brand), Hanken Grotesk (text and numbers),
Noto Sans SC (Chinese where PingFang SC is not installed) and Google Sans
Code (ids, paths and code). The package does not bundle font files; install
and import them once in the app entry:

```bash
pnpm add @fontsource-variable/geist @fontsource-variable/hanken-grotesk @fontsource-variable/noto-sans-sc @fontsource/google-sans-code
```

```ts
import '@fontsource-variable/geist';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/noto-sans-sc';
import '@fontsource/google-sans-code/400.css';
import '@fontsource/google-sans-code/500.css';
```

`--font-ui` lists PingFang SC ahead of Noto Sans SC, so Apple devices
render Chinese in the system face and other platforms fetch only the Noto
Sans SC subsets a page needs.

## Usage

### Set up the root

Import the stylesheet once, wrap the app in `ThemeProvider`, and pass the
matching Ant Design theme to `ConfigProvider` so antd components follow the
current colour scheme.

```tsx
import { createRoot } from 'react-dom/client';

import { ThemeProvider, getAegisTheme, useTheme } from '@lincyaw/aegis-ui';
import '@lincyaw/aegis-ui/style.css';
import { ConfigProvider } from 'antd';

function Root() {
  const { resolved } = useTheme();
  return (
    <ConfigProvider theme={getAegisTheme(resolved)}>
      <App />
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <Root />
  </ThemeProvider>,
);
```

### Register applications with the shell

Each sub-application is an `AegisApp`. Its routes are mounted under
`basePath` and its `sidebar` entries are resolved relative to it.

```tsx
import { type AegisApp, AegisShell } from '@lincyaw/aegis-ui';
import { BrowserRouter } from 'react-router-dom';

const containersApp: AegisApp = {
  id: 'containers',
  label: 'Containers',
  icon: <HddOutlined />,
  basePath: '/containers',
  description: 'Build and manage container images.',
  sidebar: [
    {
      items: [
        { to: '', label: 'List', end: true },
        { to: 'new', label: 'Create' },
      ],
    },
  ],
  routes: [
    {
      element: <ContainersRoot />,
      children: [
        { path: '', element: <ContainerList /> },
        { path: 'new', element: <ContainerCreate /> },
        { path: ':id', element: <ContainerDetail /> },
      ],
    },
  ],
};

export function App() {
  return (
    <BrowserRouter>
      <AegisShell
        brand={{ name: 'AegisLab', href: '/' }}
        apps={[containersApp]}
        fallbackPath="/containers"
      />
    </BrowserRouter>
  );
}
```

`AegisShell` also accepts `rootRoutes`, `notFoundElement`, `user`,
`userMenu`, `headerCenter`, `headerActions` and `inboxPath`. See
`AegisShellProps` in
[`packages/ui/src/layouts/shell/types.ts`](packages/ui/src/layouts/shell/types.ts).

Two optional features need a provider above the shell:

- `enableCommandPalette` mounts the command palette (Cmd/Ctrl+K). Wrap the
  shell in `CommandProvider`. Commands listed in an app's `commands` field
  appear only while that app is active.
- `agentPanel` renders the given node as a right-hand column, or as a
  full-screen overlay at 768 px and below. Wrap the shell in `AgentProvider`
  (or `AgentmChannelProvider`); a toggle appears in the header.
  Per-app environment switching is described in
  [`environments/README.md`](packages/ui/src/layouts/shell/environments/README.md).

### Write a page

The shell wraps every route in `PageWrapper`, so a page renders content only.

```tsx
import { DataTable, PageHeader, Panel } from '@lincyaw/aegis-ui';

export function ContainerList() {
  return (
    <>
      <PageHeader title="Containers" />
      <Panel>
        <DataTable columns={columns} data={rows} rowKey={(row) => row.id} />
      </Panel>
    </>
  );
}
```

## Repository layout

This is a pnpm workspace. Only `packages/ui` is published.

| Path                               | Contents                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `packages/ui/src/styles/theme.css` | Design tokens                                                                             |
| `packages/ui/src/components/ui/`   | Primitives, one `.tsx` and one `.css` per component                                       |
| `packages/ui/src/layouts/`         | `PageWrapper` and the shell                                                               |
| `packages/ui/src/theme/`           | `ThemeProvider` and the Ant Design theme                                                  |
| `packages/ui/src/agent/`           | Agent context, AgentM channel client and the agent-native runtime                         |
| `packages/ui/src/index.ts`         | Public API; anything not exported here is internal                                        |
| `apps/console/`                    | Private Vite app that hosts the gallery and the AegisLab sub-applications                 |
| `apps/console/src/apps/gallery/`   | Gallery specimens for every primitive, one file per section                               |
| `apps/console/server/`             | Go binary that serves the built console (see its [README](apps/console/server/README.md)) |
| `docs/`                            | [CSS conventions](docs/css-conventions.md) and the agent-native UI design                 |

## Development

Requires Node 22+ and pnpm 9.

```bash
pnpm install
pnpm dev        # console on http://localhost:3323 (HTTPS unless VITE_HTTPS=0)
pnpm check      # type-check, lint, stylelint, prettier, gallery coverage, MCP tool manifest
pnpm build      # library to packages/ui/dist, console to apps/console/dist
```

Rules that `pnpm check` and review enforce:

- Component and layout CSS uses tokens from `theme.css` only: no raw hex,
  `px` or `ms` values. Details are in [docs/css-conventions.md](docs/css-conventions.md).
- Components take data through props. They do not call APIs or read global
  stores.
- Every component exported from `packages/ui/src/components/ui/index.ts` has a
  specimen in the gallery. `pnpm check:gallery` fails otherwise.
- Changes to a component are checked in the gallery in light and dark mode,
  at desktop width and at 768 px or narrower.
- Commit messages follow Conventional Commits. Husky runs ESLint and Prettier
  on staged files.

## Releasing

Versions follow semver and are managed with
[Changesets](https://github.com/changesets/changesets).

1. Add a changeset describing the change: `pnpm changeset`.
2. Apply it: `pnpm changeset version`. This bumps `packages/ui/package.json`
   and updates `packages/ui/CHANGELOG.md`.
3. Commit, tag `v<version>`, and push the tag.
4. The `publish` workflow checks that the tag matches
   `packages/ui/package.json`, runs `pnpm check`, builds the library, and
   publishes it to npm. It authenticates through npm Trusted Publishing or,
   if that is not configured, the `NPM_TOKEN` repository secret.

Removing or renaming an export, changing a prop's type, or renaming a token
is a breaking change. Downstream apps (AegisLab-frontend) need a matching
update.
