import {
  PAGES_LIMITS,
  type PageVisibility,
} from '../api/pages-client';

export function humanBytes(n: number): string {
  if (n < 1024) {
    return `${n.toString()} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i] ?? ''}`;
}

export function visibilityTone(
  v: PageVisibility | string | undefined,
): 'ink' | 'default' | 'ghost' {
  switch (v) {
    case 'public_listed':
      return 'ink';
    case 'public_unlisted':
      return 'default';
    case 'private':
      return 'ghost';
    default:
      return 'ghost';
  }
}

export interface UploadValidation {
  ok: boolean;
  totalBytes: number;
  errors: string[];
}

export function validateUpload(
  files: File[],
  slug: string | undefined,
): UploadValidation {
  const errors: string[] = [];
  if (files.length === 0) {
    errors.push('Select at least one file.');
  }
  if (files.length > PAGES_LIMITS.maxFiles) {
    errors.push(
      `Too many files: ${files.length.toString()} > ${PAGES_LIMITS.maxFiles.toString()}.`,
    );
  }
  const hasMarkdown = files.some((f) =>
    /\.md$/i.test(f.webkitRelativePath !== '' ? f.webkitRelativePath : f.name),
  );
  if (files.length > 0 && !hasMarkdown) {
    errors.push('At least one .md file is required.');
  }
  let total = 0;
  for (const f of files) {
    total += f.size;
    if (f.size > PAGES_LIMITS.maxFileBytes) {
      errors.push(`"${f.name}" exceeds 10 MiB.`);
    }
  }
  if (total > PAGES_LIMITS.maxTotalBytes) {
    errors.push(`Total size ${humanBytes(total)} exceeds 50 MiB.`);
  }
  if (
    slug !== undefined &&
    slug !== '' &&
    !PAGES_LIMITS.slugPattern.test(slug)
  ) {
    errors.push(
      'Slug must match ^[a-z0-9][a-z0-9-]{0,62}$ (lowercase, digits, hyphens).',
    );
  }
  return { ok: errors.length === 0, totalBytes: total, errors };
}

export function fileRelPath(f: File): string {
  return f.webkitRelativePath !== '' ? f.webkitRelativePath : f.name;
}
