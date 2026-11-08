import { useMemo } from 'react';

import type { AegisAuthUser, AuthContextValue } from '../../auth';
import { useStrings } from '../../locale';
import type { AegisUser, AegisUserMenuItem } from './types';

/**
 * The header's user: `user` when the host passes one, else the signed-in
 * user from the auth context with `userMenu` plus a Sign out entry.
 */
export function useShellUser(
  user: AegisUser | undefined,
  userMenu: AegisUserMenuItem[] | undefined,
  auth: AuthContextValue<AegisAuthUser>,
): AegisUser | undefined {
  const { signOut: signOutLabel } = useStrings();
  return useMemo(() => {
    if (user) {
      return user;
    }
    if (auth.status !== 'authenticated' || !auth.user) {
      return undefined;
    }
    const menu = [...(userMenu ?? [])];
    const { signOut } = auth;
    if (signOut) {
      menu.push({
        key: 'sign-out',
        label: signOutLabel,
        onClick: () => {
          void signOut();
        },
      });
    }
    return { name: auth.user.name, menu };
  }, [user, userMenu, auth, signOutLabel]);
}
