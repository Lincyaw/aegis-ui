import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from 'react';

import { FileOutlined, FolderOutlined, RightOutlined } from '@ant-design/icons';

import './FileTree.css';

export interface FileTreeFile {
  /** Path from the tree root with `/` between segments, e.g. `tests/grading.toml`. */
  path: string;
  /** Trailing note, typically the file size. */
  note?: ReactNode;
}

interface FileTreeProps {
  files: FileTreeFile[];
  /** Accessible name of the tree. */
  ariaLabel: string;
  /** Path of the selected file. Whenever it changes, the directories above it open. */
  selectedPath?: string;
  /** Called with a file's path when it is clicked or activated with Enter or Space. */
  onSelect?: (path: string) => void;
  /** Directories open on first render, each written with a trailing `/`, e.g. `tests/`. */
  defaultExpandedPaths?: string[];
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
  fileCount: number;
}

interface FileEntry {
  kind: 'file';
  path: string;
  name: string;
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
          fileCount: 0,
        };
        directories.set(path, directory);
        siblings.push(directory);
      }
      directory.fileCount += 1;
      parent = directory;
      siblings = directory.children;
    }
    siblings.push({
      kind: 'file',
      path: file.path,
      name: file.path.slice(file.path.lastIndexOf('/') + 1),
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
  defaultExpandedPaths = [],
  className,
}: FileTreeProps) {
  const entries = useMemo(() => buildEntries(files), [files]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () =>
      new Set([...defaultExpandedPaths, ...ancestorPaths(selectedPath ?? '')]),
  );
  const [revealedPath, setRevealedPath] = useState(selectedPath);
  if (selectedPath !== revealedPath) {
    setRevealedPath(selectedPath);
    setExpanded(new Set([...expanded, ...ancestorPaths(selectedPath ?? '')]));
  }
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
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  };

  const focusRow = (index: number): void => {
    const item = listRef.current?.children.item(index);
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
    event: KeyboardEvent<HTMLLIElement>,
    index: number,
    entry: Entry,
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
      case ' ':
        activate(entry);
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
        const note = isDirectory ? String(entry.fileCount) : entry.note;
        return (
          <li
            key={entry.path}
            role="treeitem"
            className={
              selected
                ? 'aegis-file-tree__item aegis-file-tree__item--selected'
                : 'aegis-file-tree__item'
            }
            style={{ '--aegis-file-tree-depth': entry.depth } as CSSProperties}
            aria-level={entry.depth + 1}
            aria-setsize={setSize}
            aria-posinset={position}
            aria-expanded={isDirectory ? expanded.has(entry.path) : undefined}
            aria-selected={isDirectory ? undefined : selected}
            tabIndex={entry.path === tabStop ? 0 : -1}
            onClick={() => {
              activate(entry);
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, index, entry);
            }}
            onFocus={() => {
              setFocusedPath(entry.path);
            }}
          >
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
            <span className="aegis-file-tree__name" title={entry.path}>
              {entry.name}
            </span>
            {note !== undefined && (
              <span className="aegis-file-tree__note">{note}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
