import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type AegisAuthUser,
  AuthProvider,
  type AuthContextValue,
  type AuthStatus,
} from '@OperationsPAI/aegis-ui';

import {
  readRegistry,
  readUser,
  toAuthUser,
  writeUser,
} from './demoAuthStore';

interface Credentials {
  email: string;
  password: string;
}

interface DemoAuthProviderProps {
  children: ReactNode;
}

export function DemoAuthProvider({
  children,
}: DemoAuthProviderProps): ReactElement {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AegisAuthUser | null>(null);

  useEffect(() => {
    const existing = readUser();
    if (existing) {
      setUser(existing);
      setStatus('authenticated');
    } else {
      readRegistry();
      setStatus('unauthenticated');
    }
  }, []);

  const signIn = useCallback(
    async (credentials: unknown): Promise<void> => {
      const { email, password } = credentials as Credentials;
      await new Promise((resolve) => setTimeout(resolve, 200));
      const registry = readRegistry();
      const normalized = email.trim().toLowerCase();
      const match = registry.find(
        (r) => r.email.toLowerCase() === normalized && r.password === password,
      );
      if (!match) {
        throw new Error('Invalid email or password');
      }
      const next = toAuthUser(match);
      writeUser(next);
      setUser(next);
      setStatus('authenticated');
    },
    [],
  );

  const signOut = useCallback((): void => {
    writeUser(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut }),
    [status, user, signIn, signOut],
  );

  return <AuthProvider value={value}>{children}</AuthProvider>;
}
