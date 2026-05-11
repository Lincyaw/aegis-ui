import { useContext } from 'react';

import {
  type AegisAuthUser,
  AuthContext,
  type AuthContextValue,
} from './authContext';

/**
 * Read the current auth context. Returns the default unauthenticated
 * state when no `<AuthProvider>` is mounted, so render code does not
 * have to special-case "auth not wired yet".
 */
export function useAuth<TUser = AegisAuthUser>(): AuthContextValue<TUser> {
  return useContext(AuthContext) as AuthContextValue<TUser>;
}
