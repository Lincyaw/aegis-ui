import { useCallback, useEffect, useRef, useState } from 'react';

import type { FileDropzoneItem } from '@lincyaw/aegis-ui';

import { errMsg } from '../../../api/apiClient';
import { presignPut } from '../../../api/blobClient';
import { runPool } from '../../shared/runPool';

const UPLOAD_CONCURRENCY = 3;
const EWMA_ALPHA = 0.3;

export interface Uploads {
  items: FileDropzoneItem[];
  /** Uploads `files` under `prefix`, settling once each has finished, failed or been cancelled. */
  upload: (files: File[], prefix: string) => Promise<void>;
  dismiss: (id: string) => void;
  clearFinished: () => void;
}

/** Presigned XHR uploads into one bucket. Open uploads are aborted when the host unmounts. */
export function useUploads(bucket: string): Uploads {
  const [items, setItems] = useState<FileDropzoneItem[]>([]);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const cancelled = useRef(new Set<string>());
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const open = xhrs.current;
    return () => {
      mounted.current = false;
      open.forEach((xhr) => {
        xhr.abort();
      });
    };
  }, []);

  const patch = useCallback(
    (id: string, change: Partial<FileDropzoneItem>): void => {
      setItems((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...change } : u))
      );
    },
    []
  );

  const cancel = useCallback((id: string): void => {
    cancelled.current.add(id);
    xhrs.current.get(id)?.abort();
  }, []);

  const send = useCallback(
    async (item: FileDropzoneItem, key: string): Promise<void> => {
      const stopped = (): boolean =>
        !mounted.current || cancelled.current.has(item.id);
      if (stopped()) {
        patch(item.id, { status: 'error', error: 'Cancelled' });
        return;
      }
      const { file } = item;
      const contentType = file.type || 'application/octet-stream';
      patch(item.id, { status: 'uploading' });
      let presign: Awaited<ReturnType<typeof presignPut>>;
      try {
        presign = await presignPut(bucket, {
          key,
          content_type: contentType,
          content_length: file.size,
          ttl_seconds: 300,
        });
      } catch (e) {
        patch(item.id, { status: 'error', error: errMsg(e) });
        return;
      }
      if (stopped()) {
        patch(item.id, { status: 'error', error: 'Cancelled' });
        return;
      }

      await new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhrs.current.set(item.id, xhr);
        const finish = (change: Partial<FileDropzoneItem>): void => {
          xhrs.current.delete(item.id);
          patch(item.id, change);
          resolve();
        };

        let lastLoaded = 0;
        let lastTime = Date.now();
        let speed = 0;
        xhr.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) {
            return;
          }
          const now = Date.now();
          const elapsed = now - lastTime;
          if (elapsed > 0) {
            const instant = ((ev.loaded - lastLoaded) / elapsed) * 1000;
            speed =
              speed === 0
                ? instant
                : EWMA_ALPHA * instant + (1 - EWMA_ALPHA) * speed;
          }
          lastLoaded = ev.loaded;
          lastTime = now;
          patch(item.id, {
            progress: ev.loaded / ev.total,
            bytesUploaded: ev.loaded,
            speedBps: speed,
            etaSeconds: speed > 0 ? (file.size - ev.loaded) / speed : undefined,
          });
        };
        xhr.onload = () => {
          finish(
            xhr.status >= 200 && xhr.status < 300
              ? { status: 'done', progress: 1 }
              : { status: 'error', error: `HTTP ${xhr.status.toString()}` }
          );
        };
        xhr.onerror = () => {
          finish({ status: 'error', error: 'Network error' });
        };
        xhr.onabort = () => {
          finish({ status: 'error', error: 'Cancelled' });
        };

        const headers = new Headers(presign.presigned.headers ?? {});
        headers.set('content-type', contentType);
        xhr.open(presign.presigned.method, presign.presigned.url);
        headers.forEach((value, name) => {
          xhr.setRequestHeader(name, value);
        });
        xhr.send(file);
      });
    },
    [bucket, patch]
  );

  const upload = useCallback(
    async (files: File[], prefix: string): Promise<void> => {
      const queued = files.map((file): FileDropzoneItem => {
        const id = `${file.name}-${Date.now().toString()}-${Math.random().toString(36).slice(2, 6)}`;
        return {
          id,
          file,
          status: 'queued',
          onCancel: () => {
            cancel(id);
          },
        };
      });
      setItems((prev) => [...queued, ...prev]);
      await runPool(queued, UPLOAD_CONCURRENCY, (item) =>
        send(item, prefix + (item.file.webkitRelativePath || item.file.name))
      );
    },
    [cancel, send]
  );

  const dismiss = useCallback((id: string): void => {
    setItems((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const clearFinished = useCallback((): void => {
    setItems((prev) =>
      prev.filter((u) => u.status !== 'done' && u.status !== 'error')
    );
  }, []);

  return { items, upload, dismiss, clearFinished };
}
