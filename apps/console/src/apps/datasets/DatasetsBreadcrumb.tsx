import type { ReactElement, ReactNode } from 'react';

import { Breadcrumb, useActiveApp } from '@lincyaw/aegis-ui';

import { RouterLink } from '../shared/RouterLink';

/**
 * The datasets app sets `breadcrumbBar: false`, so its sub-pages render
 * their own trail back to the browse page.
 */
export function DatasetsBreadcrumb({
  current,
}: {
  current: ReactNode;
}): ReactElement {
  const { basePath } = useActiveApp();
  return (
    <Breadcrumb
      items={[{ label: 'Datasets', to: basePath }, { label: current }]}
      linkComponent={RouterLink}
    />
  );
}
