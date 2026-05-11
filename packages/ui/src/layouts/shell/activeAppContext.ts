import { createContext, useContext } from 'react';

/**
 * The slice of the active app exposed to its `header` and routes via
 * Context. Lets app-scoped components build URLs from `basePath` instead
 * of hardcoding it — so an app stays portable if its mount path changes.
 */
export interface ActiveAppContextValue {
  id: string;
  basePath: string;
}

export const ActiveAppContext = createContext<ActiveAppContextValue | null>(
  null,
);

/**
 * Read the active app's identity from inside its `header`, `wrap`, or
 * route subtree. Throws if used outside an `AegisShell`-mounted app.
 */
export function useActiveApp(): ActiveAppContextValue {
  const ctx = useContext(ActiveAppContext);
  if (!ctx) {
    throw new Error(
      'useActiveApp must be used inside an AegisShell-mounted app region.',
    );
  }
  return ctx;
}
