import { Link } from 'react-router-dom';

import type { LinkComponent } from '@lincyaw/aegis-ui';

/** React Router adapter for primitives that take a `linkComponent`. */
export const RouterLink: LinkComponent = ({
  to,
  className,
  'aria-current': ariaCurrent,
  children,
}) => (
  <Link to={to} className={className} aria-current={ariaCurrent}>
    {children}
  </Link>
);
