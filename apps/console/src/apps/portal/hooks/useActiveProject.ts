import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveProjectState {
  activeProjectId: number | null;
  setActiveProject: (id: number | null) => void;
}

export const useActiveProjectStore = create<ActiveProjectState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      setActiveProject: (id) => {
        set({ activeProjectId: id });
      },
    }),
    { name: 'portal:active-project' }
  )
);

export function useActiveProjectIdNum(): number {
  const fromStore = useActiveProjectStore((s) => s.activeProjectId);
  const search = globalThis.location?.search ?? '';
  if (search) {
    const fromUrl = new URLSearchParams(search).get('project');
    if (fromUrl) {
      const n = Number.parseInt(fromUrl, 10);
      if (!Number.isNaN(n) && n > 0) {
        return n;
      }
    }
  }
  return fromStore ?? 0;
}
