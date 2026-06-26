/**
 * Slug resolution for wikilinks. A slug is a filename without its `.md`
 * extension; resolution is case-insensitive and ignores the directory the note
 * lives in (per the note format spec). Alias resolution is intentionally left
 * out for now — it would require eagerly fetching every file's frontmatter.
 */
export interface NoteFile {
  /** Full repo-relative path, e.g. `research/cap.md`. */
  path: string;
  /** Filename including extension, e.g. `cap.md`. */
  name: string;
  /** Filename without `.md`, e.g. `cap`. */
  slug: string;
}

export function buildNoteFiles(paths: string[]): NoteFile[] {
  return paths.map((path) => {
    const name = path.split('/').pop() ?? path;
    const slug = name.replace(/\.md$/i, '');
    return { path, name, slug };
  });
}

export function buildSlugIndex(files: NoteFile[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const file of files) {
    const key = file.slug.toLowerCase();
    // First match wins so a deterministic note is picked when slugs collide
    // across directories.
    if (!index.has(key)) {
      index.set(key, file.path);
    }
  }
  return index;
}

export function resolveSlugToPath(
  index: Map<string, string>,
  slug: string,
): string | null {
  return index.get(slug.trim().toLowerCase()) ?? null;
}
