# @OperationsPAI/aegis-ui

AegisLab shared design system — tokens, primitives, layouts, AntD theme.
Consumed by any AegisLab sub-application (portal, container service,
dataset manager, ...).

## Install

```bash
NPM_TOKEN=<your_github_token> pnpm add @OperationsPAI/aegis-ui
```

The package is published to GitHub Packages under the `@OperationsPAI` scope.
Configure `.npmrc` once per consumer repo:

```
@OperationsPAI:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

## Use

```tsx
import { PageWrapper, PageHeader, Panel, DataTable } from '@OperationsPAI/aegis-ui';
import '@OperationsPAI/aegis-ui/style.css';

export default function ContainersPage() {
  return (
    <PageWrapper>
      <PageHeader title="Containers" />
      <Panel>
        <DataTable columns={...} data={...} />
      </Panel>
    </PageWrapper>
  );
}
```

Wrap the app in AntD `ConfigProvider` with the shipped theme:

```tsx
import { ConfigProvider } from 'antd';
import { aegisTheme } from '@OperationsPAI/aegis-ui';

<ConfigProvider theme={aegisTheme}>
  <App />
</ConfigProvider>
```

## Develop

```bash
NPM_TOKEN=<token> pnpm install
pnpm dev          # local playground (gallery) on http://localhost:3100
pnpm type-check
pnpm build        # emits dist/{index.js,index.cjs,index.d.ts,style.css}
```

The gallery (`src/playground/Gallery.tsx`) is the live spec — every primitive
ships with a specimen there. Adding a primitive without a gallery entry is
incomplete.

## Design principles

- All visual values flow from tokens in `src/styles/theme.css`. No raw hex /
  px / ms in component CSS.
- Activation is surface inversion (`--bg-inverted`), not accent color.
- Anomaly red (`--accent-warning`) is reserved for real anomalies.
- Type stack: Geist (brand), Inter (UI), JetBrains Mono (data).
- Components are presentational. No API calls, no global state.
