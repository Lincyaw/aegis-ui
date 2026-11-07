import { useCallback } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { gatewayUrlFor } from '../../../config/runtime';
import { portalAxios } from '../../portal/api/portal-client';

// Defaults for the knowledge-base repo. Change these (or thread props through)
// to point the reader at a different private repo.
export const NOTES_OWNER = 'Lincyaw';
export const NOTES_REPO = 'Notes';
export const NOTES_BRANCH = 'main';

const STALE_MS = 5 * 60 * 1000;

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

export interface GitTreeEntry {
  path: string;
  type: 'blob' | 'tree' | string;
  sha: string;
  size?: number;
}

interface GitTreeResponse {
  tree: GitTreeEntry[];
  truncated?: boolean;
}

export interface RepoTree {
  /** Markdown files, sorted by path. */
  entries: GitTreeEntry[];
  /** GitHub stopped listing part-way; some notes are missing from `entries`. */
  truncated: boolean;
}

interface GitContentResponse {
  type: string;
  encoding?: string;
  content?: string;
  sha: string;
  name: string;
  path: string;
}

export const notesKeys = {
  all: ['notes'] as const,
  tree: (ref: RepoRef) =>
    ['notes', 'tree', ref.owner, ref.repo, ref.branch] as const,
  file: (owner: string, repo: string, path: string) =>
    ['notes', 'file', owner, repo, path] as const,
};

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function decodeBase64Utf8(content: string): string {
  const binary = atob(content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

/** Markdown files in the repo. Cached aggressively. */
export function useRepoTree(
  ref: RepoRef = { owner: NOTES_OWNER, repo: NOTES_REPO, branch: NOTES_BRANCH }
) {
  return useQuery({
    queryKey: notesKeys.tree(ref),
    staleTime: STALE_MS,
    queryFn: async (): Promise<RepoTree> => {
      const url = gatewayUrlFor(
        `/api/v2/github/repos/${ref.owner}/${ref.repo}/git/trees/${ref.branch}?recursive=1`
      );
      const res = await portalAxios.get<GitTreeResponse>(url);
      const entries = res.data.tree
        .filter(
          (entry) =>
            entry.type === 'blob' && entry.path.toLowerCase().endsWith('.md')
        )
        .sort((a, b) => a.path.localeCompare(b.path));
      return { entries, truncated: res.data.truncated === true };
    },
  });
}

/** Invalidate all notes caches (tree + every file). */
export function useRefreshNotes(): () => void {
  const qc = useQueryClient();
  return useCallback(() => {
    void qc.invalidateQueries({ queryKey: notesKeys.all });
  }, [qc]);
}

/** Decoded UTF-8 content for a single markdown file. */
export function useFileContent(
  path: string | undefined,
  owner: string = NOTES_OWNER,
  repo: string = NOTES_REPO
) {
  return useQuery({
    queryKey: notesKeys.file(owner, repo, path ?? ''),
    enabled: Boolean(path),
    staleTime: STALE_MS,
    retry: false,
    queryFn: async (): Promise<string> => {
      if (!path) {
        return '';
      }
      const url = gatewayUrlFor(
        `/api/v2/github/repos/${owner}/${repo}/contents/${encodePath(path)}`
      );
      const res = await portalAxios.get<GitContentResponse>(url);
      const { content, encoding } = res.data;
      // The contents API leaves `content` out of files over 1 MB.
      if (typeof content !== 'string' || encoding === 'none') {
        throw new Error(
          `GitHub returned no content for ${path}; files over 1 MB cannot be read through the contents API.`
        );
      }
      return encoding === 'base64' ? decodeBase64Utf8(content) : content;
    },
  });
}
