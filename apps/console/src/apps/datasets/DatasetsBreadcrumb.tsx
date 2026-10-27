import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Breadcrumb, useActiveApp } from '@lincyaw/aegis-ui';

function RouterLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

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
