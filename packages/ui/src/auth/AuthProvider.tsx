import type { ReactElement, ReactNode } from 'react';

import {
  type AegisAuthUser,
  AuthContext,
  type AuthContextValue,
} from './authContext';

interface AuthProviderProps<TUser = AegisAuthUser> {
  value: AuthContextValue<TUser>;
  children: ReactNode;
}

/**
 * Thin context wrapper. The library deliberately holds no auth state —
 * the host owns sign-in, token storage, SSO callbacks, etc., and feeds
 * the resulting `{ status, user, signIn?, signOut? }` value in.
 */
export function AuthProvider<TUser = AegisAuthUser>({
  value,
  children,
}: AuthProviderProps<TUser>): ReactElement {
  return (
    <AuthContext.Provider value={value as AuthContextValue<unknown>}>
      {children}
    </AuthContext.Provider>
  );
}
