import { Navigate, useSearchParams } from 'react-router-dom';

import { useAppHref } from '@lincyaw/aegis-ui';

interface InjectionDrillRedirectProps {
  /** Tab path under the nested injection layout. */
  target: '' | 'data';
}

/**
 * Redirects legacy `/portal/<target>?injection=<id>` URLs to the new nested
 * shape `/portal/injections/<id>/<target>`. Missing/invalid id falls back to
 * the injection list.
 */
export function InjectionDrillRedirect({
  target,
}: InjectionDrillRedirectProps) {
  const [params] = useSearchParams();
  const href = useAppHref();
  const raw = params.get('injection');
  const valid = raw !== null && /^\d+$/.test(raw);

  if (!valid) {
    return <Navigate to={href('injections')} replace />;
  }

  const path = target === '' ? `injections/${raw}` : `injections/${raw}/${target}`;
  return <Navigate to={href(path)} replace />;
}

export default InjectionDrillRedirect;
