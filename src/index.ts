/**
 * @OperationsPAI/aegis-ui — public API.
 *
 * Add a new primitive ⇒ export it here AND add a specimen to
 * `src/playground/Gallery.tsx`. The gallery is the live spec.
 */

// Primitives
export * from './components/ui';

// Layouts
export { PageWrapper } from './layouts/PageWrapper';
export type { PageWrapperProps } from './layouts/PageWrapper';

// Shell (router-aware)
export { AegisShell } from './layouts/shell';
export type {
  AegisApp,
  AegisAppNavGroup,
  AegisAppNavItem,
  AegisBrand,
  AegisShellProps,
  AegisUser,
} from './layouts/shell';

// AntD ConfigProvider theme mapped to aegis-ui tokens.
export { aegisTheme } from './theme/antdTheme';
