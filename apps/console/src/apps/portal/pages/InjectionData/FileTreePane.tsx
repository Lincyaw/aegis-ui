import { useMemo, useState } from 'react';

import { Chip, EmptyState, ErrorState, MonoValue } from '@lincyaw/aegis-ui';
import type { InjectionDatapackFileItem, InjectionDatapackFilesResp } from '@lincyaw/portal';

interface FileTreePaneProps {
  data?: InjectionDatapackFilesResp;
  isLoading: boolean;
  error: unknown;
  selectedPath?: string;
  onSelect: (item: InjectionDatapackFileItem) => void;
}

export function FileTreePane({
  data,
  isLoading,
  error,
  selectedPath,
  onSelect,
}: FileTreePaneProps) {
  const files = useMemo(() => data?.files ?? [], [data]);

  if (isLoading) {
    return <EmptyState title='Loading datapack files…' />;
  }
  if (error) {
    return (
      <ErrorState
        title='Failed to load datapack files'
        description={errorMessage(error)}
      />
    );
  }
  if (files.length === 0) {
    return (
      <EmptyState
        title='Datapack has no files yet'
        description='The injection has not produced any datapack artifacts.'
      />
    );
  }

  return (
    <div className='injection-data__tree' role='tree'>
      {files.map((f, i) => (
        <FileNode
          key={`${f.path ?? f.name ?? 'node'}-${String(i)}`}
          item={f}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface FileNodeProps {
  item: InjectionDatapackFileItem;
  depth: number;
  selectedPath?: string;
  onSelect: (item: InjectionDatapackFileItem) => void;
}

function FileNode({ item, depth, selectedPath, onSelect }: FileNodeProps) {
  const isDir = Array.isArray(item.children);
  const [open, setOpen] = useState(depth < 1);
  const padLeft = `calc(var(--space-3) + ${String(depth)} * var(--space-3))`;
  const selected = !isDir && item.path !== undefined && item.path === selectedPath;

  const handleClick = (): void => {
    if (isDir) {
      setOpen((v) => !v);
    } else {
      onSelect(item);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div role='treeitem' aria-expanded={isDir ? open : undefined}>
      <button
        type='button'
        className={`injection-data__tree-row${selected ? ' is-selected' : ''}`}
        style={{ paddingInlineStart: padLeft }}
        onClick={handleClick}
        onKeyDown={handleKey}
      >
        <span className='injection-data__tree-glyph' aria-hidden='true'>
          {isDir ? (open ? '▾' : '▸') : '·'}
        </span>
        <span className='injection-data__tree-name'>{item.name ?? '(unnamed)'}</span>
        {!isDir && item.size !== undefined && (
          <MonoValue size='sm'>{item.size}</MonoValue>
        )}
        {!isDir && isParquet(item.name) && <Chip tone='ink'>parquet</Chip>}
      </button>
      {isDir && open && item.children && (
        <div role='group'>
          {item.children.map((c, i) => (
            <FileNode
              key={`${c.path ?? c.name ?? 'node'}-${String(i)}`}
              item={c}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function isParquet(name: string | undefined): boolean {
  return name !== undefined && /\.parquet$/i.test(name);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
