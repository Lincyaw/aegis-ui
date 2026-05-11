import {
  type ReactElement,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { type DemoContainer, seedContainers } from './data';

interface ContainersState {
  containers: DemoContainer[];
  addContainer: (input: Omit<DemoContainer, 'id' | 'createdAt'>) => string;
  removeContainer: (id: string) => void;
}

const Ctx = createContext<ContainersState | null>(null);

export function ContainersProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [containers, setContainers] = useState<DemoContainer[]>(seedContainers);

  const addContainer = useCallback<ContainersState['addContainer']>((input) => {
    const id = `c-${Math.random().toString(36).slice(2, 6)}`;
    const created: DemoContainer = {
      ...input,
      id,
      createdAt: new Date().toISOString(),
    };
    setContainers((prev) => [created, ...prev]);
    return id;
  }, []);

  const removeContainer = useCallback<ContainersState['removeContainer']>(
    (id) => {
      setContainers((prev) => prev.filter((c) => c.id !== id));
    },
    [],
  );

  const value = useMemo(
    () => ({ containers, addContainer, removeContainer }),
    [containers, addContainer, removeContainer],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContainers(): ContainersState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useContainers must be used inside <ContainersProvider>');
  }
  return ctx;
}
