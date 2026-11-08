/** Picks a local directory and remembers its handle across reloads. */
import {
  type DirectoryHandle,
  FSAccessCaseRepo,
  FSAccessSftRepo,
} from './fsAccess';

type ShowDirectoryPickerFn = (options?: {
  id?: string;
  mode?: 'read' | 'readwrite';
}) => Promise<DirectoryHandle>;

declare global {
  interface Window {
    showDirectoryPicker?: ShowDirectoryPickerFn;
  }
}

const IDB_NAME = 'aegis-llmharness-review';
const IDB_STORE = 'handles';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(IDB_STORE, 'readonly')
      .objectStore(IDB_STORE)
      .get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbWrite(write: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    write(tx.objectStore(IDB_STORE));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function isFsAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.showDirectoryPicker === 'function'
  );
}

interface PermissionQueryable {
  queryPermission?: (opts: { mode: 'read' }) => Promise<PermissionState>;
  requestPermission?: (opts: { mode: 'read' }) => Promise<PermissionState>;
}

function persistedRoot<R>(
  pickerId: string,
  idbKey: string,
  wrap: (handle: DirectoryHandle) => R
) {
  return {
    async pick(): Promise<R> {
      if (!window.showDirectoryPicker) {
        throw new Error(
          'File System Access API is not available in this browser.'
        );
      }
      const handle = await window.showDirectoryPicker({
        id: pickerId,
        mode: 'read',
      });
      await idbWrite((store) => store.put(handle, idbKey));
      return wrap(handle);
    },
    /** The remembered directory, or null when there is none or the user
     *  declines to grant read access again. */
    async restore(): Promise<R | null> {
      if (!isFsAccessSupported()) {
        return null;
      }
      const handle = await idbGet<DirectoryHandle>(idbKey);
      if (!handle) {
        return null;
      }
      const perms = handle as unknown as PermissionQueryable;
      if (perms.queryPermission) {
        const state = await perms.queryPermission({ mode: 'read' });
        if (state !== 'granted') {
          const next = perms.requestPermission
            ? await perms.requestPermission({ mode: 'read' })
            : state;
          if (next !== 'granted') {
            return null;
          }
        }
      }
      return wrap(handle);
    },
    async clear(): Promise<void> {
      await idbWrite((store) => store.delete(idbKey));
    },
  };
}

const casesRoot = persistedRoot(
  'aegis-cases-root',
  'cases-root',
  (h) => new FSAccessCaseRepo(h)
);
const sftRoot = persistedRoot(
  'aegis-sft-root',
  'sft-root',
  (h) => new FSAccessSftRepo(h)
);

export const pickCasesRoot = casesRoot.pick;
export const restoreCasesRoot = casesRoot.restore;
export const clearStoredRoot = casesRoot.clear;
export const pickSftRoot = sftRoot.pick;
export const restoreSftRoot = sftRoot.restore;
export const clearStoredSftRoot = sftRoot.clear;
