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
  file: File;
  format: DemoDataset['format'];
  /** Fraction uploaded, 0–1. */
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
      // A small blank file, so the queue has a real size to report.
      const size = Math.floor((64 + Math.random() * 448) * 1024);
      const file = new File([new Uint8Array(size)], filename);
      const job: UploadJob = { id, file, format, progress: 0, done: false };
      setUploads((prev) => [job, ...prev]);

      let sent = 0;
      const interval = window.setInterval(() => {
        sent = Math.min(1, sent + 0.08 + Math.random() * 0.12);
        const progress = sent;
        const done = progress >= 1;
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, progress, done } : u))
        );
        if (done) {
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
