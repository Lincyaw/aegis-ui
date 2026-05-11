import {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { type DemoDataset, seedDatasets } from './data';

export interface UploadJob {
  id: string;
  filename: string;
  format: DemoDataset['format'];
  progress: number;
  done: boolean;
}

interface DatasetsState {
  datasets: DemoDataset[];
  uploads: UploadJob[];
  startUpload: (filename: string, format: DemoDataset['format']) => string;
}

const Ctx = createContext<DatasetsState | null>(null);

export function DatasetsProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [datasets, setDatasets] = useState<DemoDataset[]>(seedDatasets);
  const [uploads, setUploads] = useState<UploadJob[]>([]);

  const startUpload = useCallback<DatasetsState['startUpload']>(
    (filename, format) => {
      const id = `up-${Math.random().toString(36).slice(2, 7)}`;
      const job: UploadJob = { id, filename, format, progress: 0, done: false };
      setUploads((prev) => [job, ...prev]);

      const interval = window.setInterval(() => {
        setUploads((prev) => {
          const next = prev.map((u) => {
            if (u.id !== id || u.done) {
              return u;
            }
            const step = 8 + Math.random() * 12;
            const progress = Math.min(100, u.progress + step);
            return { ...u, progress, done: progress >= 100 };
          });
          const justFinished = next.some((u) => u.id === id && u.done);
          if (justFinished) {
            window.clearInterval(interval);
            const newDataset: DemoDataset = {
              id: `ds-${id}`,
              name: filename.replace(/\.[^.]+$/, ''),
              description: 'Uploaded from the playground.',
              rows: Math.floor(50_000 + Math.random() * 1_000_000),
              sizeMb: Math.floor(10 + Math.random() * 400),
              format,
              tags: ['user-upload'],
              updatedAt: new Date().toISOString(),
            };
            setDatasets((prevDs) => [newDataset, ...prevDs]);
          }
          return next;
        });
      }, 220);
      return id;
    },
    []
  );

  const value = useMemo(
    () => ({ datasets, uploads, startUpload }),
    [datasets, uploads, startUpload]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDatasets(): DatasetsState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useDatasets must be used inside <DatasetsProvider>');
  }
  return ctx;
}
