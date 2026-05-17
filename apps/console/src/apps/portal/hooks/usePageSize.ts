import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PageSizeState {
  sizes: Record<string, number>;
  setSize: (scope: string, size: number) => void;
}

const usePageSizeStore = create<PageSizeState>()(
  persist(
    (set) => ({
      sizes: {},
      setSize: (scope, size) => {
        set((s) => ({ sizes: { ...s.sizes, [scope]: size } }));
      },
    }),
    { name: 'portal:page-sizes' }
  )
);

export interface UsePageSizeReturn {
  size: number;
  setSize: (n: number) => void;
}

export function usePageSize(scope: string, fallback = 20): UsePageSizeReturn {
  const size = usePageSizeStore((s) => s.sizes[scope] ?? fallback);
  const setSize = usePageSizeStore((s) => s.setSize);
  return {
    size,
    setSize: (n: number) => {
      setSize(scope, n);
    },
  };
}
