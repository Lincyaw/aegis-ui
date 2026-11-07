export const blobKeys = {
  buckets: ['blob', 'buckets'] as const,
  folder: (bucket: string, prefix: string) =>
    ['blob', 'folder', bucket, prefix] as const,
  bucketFolders: (bucket: string) => ['blob', 'folder', bucket] as const,
};
