import {
  type CSSProperties,
  Fragment,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { FileOutlined, FolderOutlined, RightOutlined } from '@ant-design/icons';

import './FileTree.css';
import { SelectedRowDetailContext } from './selectedRowDetail';

export interface FileTreeFile {
  /** Path from the tree root with `/` between segments, e.g. `tests/grading.toml`. */
  path: string;
  /** Shown in place of the file name, e.g. a note's name without `.md`. The row's title keeps the path. */
  label?: ReactNode;
  /** Trailing note, typically the file size. It is the row's accessible description, not part of its name. */
  note?: ReactNode;
}

export interface FileTreeProps {
  files: FileTreeFile[];
  /** Accessible name of the tree. */
  ariaLabel: string;
  /**
   * Path of the selected file. Whenever it changes, the directories above
   * it open, unless `expandedPaths` controls them.
   */
  selectedPath?: string;
  /** Called with a file's path when it is clicked or activated with Enter or Space. */
  onSelect?: (path: string) => void;
  /**
   * A file's URL. With it each file row is a link, so the browser's own
   * link actions (open in a new tab, copy the address) work on it, and
   * opening the row follows the link as well as calling `onSelect`.
   */
  fileHref?: (path: string) => string;
  /** Where file links open, e.g. `_blank`. */
  fileTarget?: string;
  /** Open directories, each written with a trailing `/`, e.g. `tests/`. Omit it to let the tree track them. */
  expandedPaths?: string[];
  /** Directories open on first render when `expandedPaths` is omitted. */
  defaultExpandedPaths?: string[];
  /** Called with the open directories whenever one opens or closes. */
  onExpandedPathsChange?: (paths: string[]) => void;
  /**
   * A directory's trailing note, from its path (with a trailing `/`) and
   * every file below it at any depth, e.g. how many of them changed. Return
   * `undefined` for no note. Default: the number of files.
   */
  directoryNote?: (path: string, files: FileTreeFile[]) => ReactNode;
  className?: string;
}

interface DirectoryEntry {
  kind: 'directory';
  /** The directory's path with a trailing `/`, e.g. `tests/cases/`. */
  path: string;
  name: string;
  depth: number;
  parentPath?: string;
  children: Entry[];
  /** Every file below the directory, at any depth. */
  files: FileTreeFile[];
}

interface FileEntry {
  kind: 'file';
  path: string;
  name: string;
  label?: ReactNode;
  depth: number;
  parentPath?: string;
  note?: ReactNode;
}

type Entry = DirectoryEntry | FileEntry;

interface Row {
  entry: Entry;
  position: number;
  setSize: number;
}

function buildEntries(files: FileTreeFile[]): Entry[] {
  const roots: Entry[] = [];
  const directories = new Map<string, DirectoryEntry>();
  for (const file of files) {
    const segments = file.path.split('/');
    let siblings = roots;
    let parent: DirectoryEntry | undefined;
    for (const [depth, segment] of segments.slice(0, -1).entries()) {
      const path = `${parent?.path ?? ''}${segment}/`;
      let directory = directories.get(path);
      if (directory === undefined) {
        directory = {
          kind: 'directory',
          path,
          name: `${segment}/`,
          depth,
          parentPath: parent?.path,
          children: [],
          files: [],
        };
        directories.set(path, directory);
        siblings.push(directory);
      }
      directory.files.push(file);
      parent = directory;
      siblings = directory.children;
    }
    siblings.push({
      kind: 'file',
      path: file.path,
      name: file.path.slice(file.path.lastIndexOf('/') + 1),
      label: file.label,
      depth: segments.length - 1,
      parentPath: parent?.path,
      note: file.note,
    });
  }
  return roots;
}

/** Rows of the open part of the tree; each level lists its directories before its files. */
function visibleRows(
  entries: Entry[],
  expanded: ReadonlySet<string>,
  rows: Row[] = [],
): Row[] {
  const ordered = [
    ...entries.filter((entry) => entry.kind === 'directory'),
    ...entries.filter((entry) => entry.kind === 'file'),
  ];
  ordered.forEach((entry, index) => {
    rows.push({ entry, position: index + 1, setSize: ordered.length });
    if (entry.kind === 'directory' && expanded.has(entry.path)) {
      visibleRows(entry.children, expanded, rows);
    }
  });
  return rows;
}

function ancestorPaths(path: string): string[] {
  const segments = path.split('/').slice(0, -1);
  return segments.map(
    (_, index) => `${segments.slice(0, index + 1).join('/')}/`,
  );
}

export function FileTree({
  files,
  ariaLabel,
  selectedPath,
  onSelect,
  fileHref,
  fileTarget,
  expandedPaths,
  defaultExpandedPaths = [],
  onExpandedPathsChange,
  directoryNote,
  className,
}: FileTreeProps) {
  const idPrefix = useId();
  const selection = useContext(SelectedRowDetailContext);
  const entries = useMemo(() => buildEntries(files), [files]);
  const [trackedPaths, setTrackedPaths] = useState<string[]>(() => [
    ...defaultExpandedPaths,
    ...ancestorPaths(selectedPath ?? ''),
  ]);
  const [revealedPath, setRevealedPath] = useState(selectedPath);
  if (selectedPath !== revealedPath) {
    setRevealedPath(selectedPath);
    setTrackedPaths([
      ...new Set([...trackedPaths, ...ancestorPaths(selectedPath ?? '')]),
    ]);
  }
  const openPaths = expandedPaths ?? trackedPaths;
  const expanded = useMemo(() => new Set(openPaths), [openPaths]);
  const [focusedPath, setFocusedPath] = useState<string>();
  const listRef = useRef<HTMLUListElement>(null);
  const rows = useMemo(
    () => visibleRows(entries, expanded),
    [entries, expanded],
  );
  const tabStop =
    [focusedPath, selectedPath].find((path) =>
      rows.some((row) => row.entry.path === path),
    ) ?? rows[0]?.entry.path;

  const setDirectoryExpanded = (path: string, open: boolean): void => {
    const next = open
      ? [...openPaths, path]
      : openPaths.filter((item) => item !== path);
    if (expandedPaths === undefined) {
      setTrackedPaths(next);
    }
    onExpandedPathsChange?.(next);
  };

  const focusRow = (index: number): void => {
    // Only the tree's own rows: a detail drawn among them may hold a tree.
    const item = listRef.current
      ?.querySelectorAll(
        ':scope > [role="treeitem"], :scope > li > [role="treeitem"]',
      )
      .item(index);
    if (item instanceof HTMLElement) {
      item.focus();
    }
  };

  const activate = (entry: Entry): void => {
    if (entry.kind === 'directory') {
      setDirectoryExpanded(entry.path, !expanded.has(entry.path));
    } else {
      onSelect?.(entry.path);
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    index: number,
    entry: Entry,
    isLink: boolean,
  ): void => {
    const open = entry.kind === 'directory' && expanded.has(entry.path);
    switch (event.key) {
      case 'ArrowDown':
        focusRow(index + 1);
        break;
      case 'ArrowUp':
        focusRow(index - 1);
        break;
      case 'Home':
        focusRow(0);
        break;
      case 'End':
        focusRow(rows.length - 1);
        break;
      case 'ArrowRight':
        if (open) {
          focusRow(index + 1);
        } else if (entry.kind === 'directory') {
          setDirectoryExpanded(entry.path, true);
        }
        break;
      case 'ArrowLeft':
        if (open) {
          setDirectoryExpanded(entry.path, false);
        } else if (entry.parentPath !== undefined) {
          const { parentPath } = entry;
          focusRow(rows.findIndex((row) => row.entry.path === parentPath));
        }
        break;
      case 'Enter':
        // A link's own Enter follows it and clicks it, which activates it.
        if (isLink) {
          return;
        }
        activate(entry);
        break;
      case ' ':
        if (isLink) {
          event.currentTarget.click();
        } else {
          activate(entry);
        }
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const cls = ['aegis-file-tree', className ?? ''].filter(Boolean).join(' ');

  return (
    <ul ref={listRef} className={cls} role="tree" aria-label={ariaLabel}>
      {rows.map(({ entry, position, setSize }, index) => {
        const isDirectory = entry.kind === 'directory';
        const selected = !isDirectory && entry.path === selectedPath;
        const note = !isDirectory
          ? entry.note
          : directoryNote
            ? directoryNote(entry.path, entry.files)
            : String(entry.files.length);
        const nameId = `${idPrefix}-name-${String(index)}`;
        const noteId = `${idPrefix}-note-${String(index)}`;
        const href = isDirectory ? undefined : fileHref?.(entry.path);
        const itemProps: HTMLAttributes<HTMLElement> = {
          className: selected
            ? 'aegis-file-tree__item aegis-file-tree__item--selected'
            : 'aegis-file-tree__item',
          style: { '--aegis-file-tree-depth': entry.depth } as CSSProperties,
          'aria-labelledby': nameId,
          'aria-describedby': note === undefined ? undefined : noteId,
          'aria-level': entry.depth + 1,
          'aria-setsize': setSize,
          'aria-posinset': position,
          'aria-expanded': isDirectory ? expanded.has(entry.path) : undefined,
          tabIndex: entry.path === tabStop ? 0 : -1,
          onClick: () => {
            activate(entry);
          },
          onKeyDown: (event) => {
            handleKeyDown(event, index, entry, href !== undefined);
          },
          onFocus: () => {
            setFocusedPath(entry.path);
          },
        };
        const content = (
          <>
            {isDirectory ? (
              <>
                <RightOutlined
                  className="aegis-file-tree__chevron"
                  aria-hidden
                />
                <FolderOutlined className="aegis-file-tree__icon" aria-hidden />
              </>
            ) : (
              <FileOutlined className="aegis-file-tree__icon" aria-hidden />
            )}
            <span
              id={nameId}
              className="aegis-file-tree__name"
              title={entry.path}
            >
              {entry.kind === 'file' ? (entry.label ?? entry.name) : entry.name}
            </span>
            {note !== undefined && (
              <span id={noteId} className="aegis-file-tree__note">
                {note}
              </span>
            )}
          </>
        );
        const rowRef = selected ? selection?.placeRow : undefined;
        return (
          <Fragment key={entry.path}>
            {href === undefined ? (
              <li
                ref={rowRef}
                role="treeitem"
                aria-selected={isDirectory ? undefined : selected}
                {...itemProps}
              >
                {content}
              </li>
            ) : (
              <li role="none">
                <a
                  ref={rowRef}
                  role="treeitem"
                  aria-selected={selected}
                  href={href}
                  target={fileTarget}
                  rel={
                    fileTarget === '_blank' ? 'noopener noreferrer' : undefined
                  }
                  {...itemProps}
                >
                  {content}
                </a>
              </li>
            )}
            {selected && selection?.inline ? (
              <li role="none">{selection.inline}</li>
            ) : null}
          </Fragment>
        );
      })}
    </ul>
  );
}
