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
import { portalApp } from './apps/portal';
import { settingsApp } from './apps/settings';
import { trajectoriesApp } from './apps/trajectories';

export const registeredApps: AegisApp[] = [
  portalApp,
  containersApp,
  datasetsApp,
  trajectoriesApp,
  blobApp,
  settingsApp,
  galleryApp,
  envDemoAlphaApp,
  envDemoBravoApp,
  envDemoNoneApp,
];
