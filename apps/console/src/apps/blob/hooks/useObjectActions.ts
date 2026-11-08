import { useCallback, useMemo } from 'react';

import type { ShareLinkResult } from '@lincyaw/aegis-ui';
import { useQueryClient } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';

import { errMsg } from '../../../api/apiClient';
import {
  batchDelete,
  copyObject,
  deleteObject,
  presignGet,
  presignPut,
  recordShare,
  downloadZip as streamZip,
  uploadWithPresign,
} from '../../../api/blobClient';
import { absoluteUrl, lastSegment, type ObjItem } from '../objects';
import { blobKeys } from '../queryKeys';

const ZIP_MAX_KEYS = 1000;
const ZIP_CONFIRM_ABOVE = 50;
const LINK_TTL_SECONDS = 300;

export interface ObjectActions {
  /** Refetches every folder of the bucket. */
  refresh: () => Promise<void>;
  remove: (item: ObjItem) => void;
  removeMany: (keys: string[]) => void;
  downloadZip: (keys: string[]) => Promise<void>;
  /** Moves the keys under `target`; false when the target was rejected. */
  move: (keys: string[], target: string) => Promise<boolean>;
  share: (
    item: ObjItem,
    opts: { ttlSeconds: number; asAttachment: boolean }
  ) => Promise<ShareLinkResult>;
  copyUrl: (item: ObjItem) => Promise<void>;
  download: (item: ObjItem) => Promise<void>;
  /** Creates `name/` under the prefix; false when it failed. */
  createFolder: (name: string) => Promise<boolean>;
}

/**
 * The object operations of the bucket browser. Each reports its outcome
 * through a toast and refreshes the bucket's listings; `onRemoved` hears
 * which keys left the folder so the page can close a preview of them.
 */
export function useObjectActions(
  bucket: string,
  prefix: string,
  onRemoved: (keys: string[]) => void
): ObjectActions {
  const { message: msg, modal } = AntdApp.useApp();
  const queryClient = useQueryClient();

  const refresh = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: blobKeys.bucketFolders(bucket),
      }),
    [bucket, queryClient]
  );

  const remove = useCallback(
    (item: ObjItem): void => {
      modal.confirm({
        title: `Delete "${item.key}"?`,
        content: `Removes the object from "${bucket}" immediately.`,
        okText: 'Delete',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deleteObject(bucket, item.key);
            void msg.success('Deleted');
            onRemoved([item.key]);
          } catch (e) {
            void msg.error(`Delete failed: ${errMsg(e)}`);
          }
          await refresh();
        },
      });
    },
    [bucket, modal, msg, onRemoved, refresh]
  );

  const removeMany = useCallback(
    (keys: string[]): void => {
      if (keys.length === 0) {
        return;
      }
      modal.confirm({
        title: `Delete ${keys.length.toString()} objects?`,
        content: 'This cannot be undone.',
        okText: 'Delete all',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            const res = await batchDelete(bucket, keys);
            onRemoved(res.deleted);
            if (res.failed.length === 0) {
              void msg.success(
                `Deleted ${res.deleted.length.toString()} objects`
              );
            } else {
              void msg.warning(
                `Deleted ${res.deleted.length.toString()}, ${res.failed.length.toString()} failed`
              );
            }
          } catch (e) {
            void msg.error(`Batch delete failed: ${errMsg(e)}`);
          }
          await refresh();
        },
      });
    },
    [bucket, modal, msg, onRemoved, refresh]
  );

  const downloadZip = useCallback(
    async (keys: string[]): Promise<void> => {
      if (keys.length === 0) {
        return;
      }
      if (keys.length > ZIP_MAX_KEYS) {
        void msg.error(
          `Select at most ${ZIP_MAX_KEYS.toString()} objects for zip download.`
        );
        return;
      }
      const confirmed =
        keys.length <= ZIP_CONFIRM_ABOVE ||
        (await new Promise<boolean>((resolve) => {
          modal.confirm({
            title: `Download ${keys.length.toString()} objects as ZIP?`,
            content:
              'The server streams the archive — large selections may take a moment.',
            onOk: () => {
              resolve(true);
            },
            onCancel: () => {
              resolve(false);
            },
          });
        }));
      if (!confirmed) {
        return;
      }
      const dismiss = msg.loading('Streaming ZIP…', 0);
      try {
        await streamZip(bucket, keys, `${bucket}-selection.zip`);
        void msg.success('ZIP downloaded');
      } catch (e) {
        void msg.error(`ZIP failed: ${errMsg(e)}`);
      } finally {
        dismiss();
      }
    },
    [bucket, modal, msg]
  );

  const move = useCallback(
    async (keys: string[], target: string): Promise<boolean> => {
      // TODO(cross-bucket-move): needs backend POST /buckets/:src/cross-copy
      // endpoint. Until then this only moves within the bucket.
      if (keys.length === 0 || target === '') {
        return false;
      }
      if (target.startsWith('/') || target.startsWith('..')) {
        void msg.error(
          'Target prefix must be a relative path within this bucket.'
        );
        return false;
      }
      const targetPrefix = target.endsWith('/') ? target : `${target}/`;
      const moved: string[] = [];
      await Promise.allSettled(
        keys.map(async (k) => {
          try {
            await copyObject(bucket, {
              src: k,
              dst: targetPrefix + lastSegment(k),
              delete_src: true,
            });
            moved.push(k);
          } catch (e) {
            void msg.error(`Move failed for ${lastSegment(k)}: ${errMsg(e)}`);
          }
        })
      );
      onRemoved(moved);
      if (moved.length === keys.length) {
        void msg.success(`Moved ${keys.length.toString()} objects`);
      }
      await refresh();
      return true;
    },
    [bucket, msg, onRemoved, refresh]
  );

  const share = useCallback(
    async (
      item: ObjItem,
      opts: { ttlSeconds: number; asAttachment: boolean }
    ): Promise<ShareLinkResult> => {
      const filename = lastSegment(item.key);
      const pr = await presignGet(bucket, {
        key: item.key,
        ttl_seconds: opts.ttlSeconds,
        response_content_type: opts.asAttachment
          ? `application/octet-stream; disposition=attachment; filename="${filename}"`
          : undefined,
      });
      const url = absoluteUrl(pr.url);
      recordShare({
        id: `${bucket}:${item.key}:${Date.now().toString()}`,
        bucket,
        key: item.key,
        url,
        expiresAt: pr.expires_at,
        createdAt: new Date().toISOString(),
        asAttachment: opts.asAttachment,
      });
      return { url, expiresAt: pr.expires_at };
    },
    [bucket]
  );

  const copyUrl = useCallback(
    async (item: ObjItem): Promise<void> => {
      try {
        const pr = await presignGet(bucket, {
          key: item.key,
          ttl_seconds: LINK_TTL_SECONDS,
        });
        await navigator.clipboard.writeText(absoluteUrl(pr.url));
        void msg.success('URL copied (5 min TTL)');
      } catch (e) {
        void msg.error(`Copy URL failed: ${errMsg(e)}`);
      }
    },
    [bucket, msg]
  );

  const download = useCallback(
    async (item: ObjItem): Promise<void> => {
      try {
        const pr = await presignGet(bucket, {
          key: item.key,
          ttl_seconds: LINK_TTL_SECONDS,
        });
        const a = document.createElement('a');
        a.href = pr.url;
        a.download = lastSegment(item.key);
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        void msg.error(`Download failed: ${errMsg(e)}`);
      }
    },
    [bucket, msg]
  );

  const createFolder = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        const presign = await presignPut(bucket, {
          key: `${prefix}${name}/.keep`,
          content_type: 'application/octet-stream',
          content_length: 0,
          ttl_seconds: LINK_TTL_SECONDS,
        });
        await uploadWithPresign(presign.presigned, new Blob([]));
        void msg.success(`Folder "${name}" created`);
        await refresh();
        return true;
      } catch (e) {
        void msg.error(`Create folder failed: ${errMsg(e)}`);
        return false;
      }
    },
    [bucket, msg, prefix, refresh]
  );

  return useMemo(
    () => ({
      refresh,
      remove,
      removeMany,
      downloadZip,
      move,
      share,
      copyUrl,
      download,
      createFolder,
    }),
    [
      copyUrl,
      createFolder,
      download,
      downloadZip,
      move,
      refresh,
      remove,
      removeMany,
      share,
    ]
  );
}
