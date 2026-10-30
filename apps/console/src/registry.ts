import type { AegisApp } from '@lincyaw/aegis-ui';

import { blobApp } from './apps/blob';
import { containersApp } from './apps/containers';
import { datasetsApp } from './apps/datasets';
import {
  envDemoAlphaApp,
  envDemoBravoApp,
  envDemoNoneApp,
} from './apps/env-demo';
import { galleryApp } from './apps/gallery';
import { llmharnessLiveApp } from './apps/llmharness-live';
import { llmharnessReviewApp } from './apps/llmharness-review';
import { notesApp } from './apps/notes';
import { pagesApp } from './apps/pages';
import { portalApp } from './apps/portal';
import { settingsApp } from './apps/settings';
import { trajectoriesApp } from './apps/trajectories';

// Demo apps run on seed data / localhost URLs; keep them out of production.
const devOnly = (apps: AegisApp[]): AegisApp[] =>
  import.meta.env.DEV ? apps : [];

export const registeredApps: AegisApp[] = [
  portalApp,
  ...devOnly([containersApp, datasetsApp]),
  trajectoriesApp,
  llmharnessLiveApp,
  llmharnessReviewApp,
  blobApp,
  pagesApp,
  notesApp,
  settingsApp,
  galleryApp,
  ...devOnly([envDemoAlphaApp, envDemoBravoApp, envDemoNoneApp]),
];
