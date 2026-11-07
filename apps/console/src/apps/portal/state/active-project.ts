import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveProjectState {
  /** The project last chosen; `useActiveProject` checks it still exists. */
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
