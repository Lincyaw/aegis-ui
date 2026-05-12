import { createContext } from 'react';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Minimal user shape consumed by the shell + auth-aware primitives.
 * SSO callers can extend with a custom generic on `AuthContextValue`.
 */
export interface AegisAuthUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  /**
   * Optional role / permission tags. The shell uses these to gate apps
   * marked with `requiredRoles`. Empty / missing means "no role claims";
   * apps without `requiredRoles` are unaffected.
   */
  roles?: string[];
}

/**
 * Contract every auth integration implements. The library does not own
 * state — callers wire their own SSO / form / token-refresh logic and
 * pass the resulting value through `<AuthProvider value={...}>`.
 *
 * `signIn` / `signOut` are optional: SSO flows typically redirect away
 * and have no in-process credential exchange.
 */
export interface AuthContextValue<TUser = AegisAuthUser> {
  status: AuthStatus;
  user: TUser | null;
  signIn?: (credentials: unknown) => Promise<void> | void;
  signOut?: () => Promise<void> | void;
}

export const defaultAuthContextValue: AuthContextValue<unknown> = {
  status: 'unauthenticated',
  user: null,
};

export const AuthContext = createContext<AuthContextValue<unknown>>(
  defaultAuthContextValue,
);
