import { resolveSlugToPath } from './slug-index';

export const NOTES_BASE = '/notes';

/**
 * Build a router URL for a note. Each path segment is encoded so spaces and
 * Unicode filenames survive, while real `/` separators stay intact — this
 * keeps the SPA history fallback happy (no `%2F` inside a single segment).
 */
export function noteUrl(path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${NOTES_BASE}/note/${encoded}`;
}

export function resolveUrl(slug: string): string {
  return `${NOTES_BASE}/resolve/${encodeURIComponent(slug)}`;
}

/** Build a wikilink resolver: slug → note router URL, or `null` if unknown. */
export function makeWikilinkResolver(
  slugIndex: Map<string, string>,
): (slug: string) => string | null {
  return (slug) => {
    const path = resolveSlugToPath(slugIndex, slug);
    return path ? noteUrl(path) : null;
  };
}
