import { type FileWithPath, fromEvent } from 'file-selector';
import type { DropEvent } from 'react-dropzone';

/**
 * Gives a file that came out of a dropped folder the `webkitRelativePath` a
 * folder picker would give it (`site/docs/intro.md`), so hosts read one
 * property whichever way the files arrived. A loose file keeps the empty
 * path a file picker gives.
 */
function withRelativePath(file: FileWithPath): File {
  if (file.webkitRelativePath !== '') {
    return file;
  }
  const path = (file.relativePath ?? file.path ?? '').replace(/^\.?\//, '');
  if (path.includes('/')) {
    Object.defineProperty(file, 'webkitRelativePath', { value: path });
  }
  return file;
}

/**
 * The drop engine of `FileDropzone` and `FolderDropzone`: walks dropped
 * folders into the files inside them, and reads file inputs as they are.
 * During a drag, before the drop, the browser exposes only the items.
 */
export async function filesFromEvent(
  event: DropEvent,
): Promise<Array<File | DataTransferItem>> {
  const entries = await fromEvent(event);
  return entries.map((entry) =>
    entry instanceof File ? withRelativePath(entry) : entry,
  );
}
