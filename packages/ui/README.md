# @lincyaw/aegis-ui

Design system and multi-app shell for AegisLab front ends: design tokens,
presentational React components, `PageWrapper`, the router-aware
`AegisShell`, and an Ant Design theme that follows the same tokens.

The package contains no API clients, business state or pages. Applications
provide their own data and plug into the shell through the `AegisApp`
contract.

## Install

```bash
pnpm add @lincyaw/aegis-ui
```

Peer dependencies: `react` 18, `react-dom` 18, `react-router-dom` 6,
`antd` 5.25 or later, `@ant-design/icons` 5.

Fonts are not bundled. Install `@fontsource-variable/geist`,
`@fontsource-variable/hanken-grotesk`, `@fontsource-variable/noto-sans-sc`
and `@fontsource/google-sans-code`, and import them once in the app entry
(Google Sans Code as its `400.css` and `500.css` weights).

## Usage

```tsx
import {
  type AegisApp,
  AegisShell,
  ThemeProvider,
  getAegisTheme,
  useTheme,
} from '@lincyaw/aegis-ui';
import '@lincyaw/aegis-ui/style.css';
import { ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';

const containersApp: AegisApp = {
  id: 'containers',
  label: 'Containers',
  icon: <HddOutlined />,
  basePath: '/containers',
  sidebar: [{ items: [{ to: '', label: 'List', end: true }] }],
  routes: [{ path: '', element: <ContainerList /> }],
};

function Root() {
  const { resolved } = useTheme();
  return (
    <ConfigProvider theme={getAegisTheme(resolved)}>
      <BrowserRouter>
        <AegisShell
          brand={{ name: 'AegisLab', href: '/' }}
          apps={[containersApp]}
          fallbackPath="/containers"
        />
      </BrowserRouter>
    </ConfigProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}
```

The shell wraps each route in `PageWrapper`, so pages render content only:

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

## Documentation

The [repository README](https://github.com/Lincyaw/aegis-ui#readme) covers the
full contents of the package, the development workflow and the release
process. The [component gallery](https://profile.aoyangfang.top/aegis-ui/)
shows every component with its variants, in light and dark themes.
