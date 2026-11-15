import { Link } from 'react-router-dom';

import type { LinkComponent } from '../../components/ui/linkComponent';

/** `LinkComponent` adapter over react-router's `<Link>`. */
export const RouterLink: LinkComponent = ({
  to,
  className,
  'aria-current': ariaCurrent,
  'aria-label': ariaLabel,
  tabIndex,
  children,
}) => (
  <Link
    to={to}
    className={className}
    aria-current={ariaCurrent}
    aria-label={ariaLabel}
    tabIndex={tabIndex}
  >
    {children}
  </Link>
);
