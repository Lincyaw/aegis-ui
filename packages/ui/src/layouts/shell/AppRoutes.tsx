import type { ReactElement } from 'react';

import { useRoutes } from 'react-router-dom';

import type { AegisApp } from './types';

export function AppRoutes({ app }: { app: AegisApp }): ReactElement | null {
  return useRoutes(app.routes);
}
