import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Button,
  Chip,
  CodeEditor,
  type CodeEditorField,
  EmptyState,
  ErrorState,
  FileTree,
  type FileTreeFile,
  MonoValue,
  Panel,
  PanelTitle,
  SkeletonText,
} from '@lincyaw/aegis-ui';
import type { InjectionDatapackFileItem } from '@lincyaw/portal';

import { errMsg } from '../../../../api/apiClient';
import {
  useDatapackFiles,
  useDatapackSchema,
  useRunDatapackQuery,
} from '../../api/datapack';
import { LoadError } from '../../components/LoadError';

import { ResultView } from './ResultView';

import './InjectionData.css';

const DEFAULT_SQL = '-- Cmd/Ctrl+Enter to run\nSELECT 1 AS hello;';

/** Every file in the datapack, keyed by its path from the datapack root. */
function flattenFiles(
  items: InjectionDatapackFileItem[] | undefined,
  prefix = '',
  out = new Map<string, InjectionDatapackFileItem>()
): Map<string, InjectionDatapackFileItem> {
  for (const item of items ?? []) {
    const path = `${prefix}${item.name ?? item.path ?? ''}`;
    if (Array.isArray(item.children)) {
      flattenFiles(item.children, `${path}/`, out);
    } else if (path !== '') {
      out.set(path, item);
    }
  }
  return out;
}

function InjectionDataView({ injectionId }: { injectionId: number }) {
  const [sql, setSql] = useState<string>(DEFAULT_SQL);
  const [selectedPath, setSelectedPath] = useState<string>();

  const filesQuery = useDatapackFiles(injectionId);
  const schemaQuery = useDatapackSchema(injectionId);
  const runMutation = useRunDatapackQuery(injectionId);

  const files = useMemo(
    () => flattenFiles(filesQuery.data?.files),
    [filesQuery.data]
  );
  const treeFiles: FileTreeFile[] = useMemo(
    () =>
      [...files].map(([path, item]) => ({
        path,
        note: item.size ?? undefined,
      })),
    [files]
  );

  const tables = useMemo(
    () =>
      (schemaQuery.data?.tables ?? [])
        .map((t) => t.name)
        .filter((name): name is string => Boolean(name)),
    [schemaQuery.data]
  );
  const fields: CodeEditorField[] = useMemo(() => {
    const byName = new Map<string, CodeEditorField>();
    for (const table of schemaQuery.data?.tables ?? []) {
      for (const column of table.columns ?? []) {
        if (column.name && !byName.has(column.name)) {
          byName.set(column.name, { name: column.name, type: column.type });
        }
      }
    }
    return [...byName.values()];
  }, [schemaQuery.data]);

  const selectFile = (path: string): void => {
    setSelectedPath(path);
    const name = files.get(path)?.name ?? '';
    if (/\.parquet$/i.test(name)) {
      setSql(`SELECT * FROM "${name.replace(/\.parquet$/i, '')}" LIMIT 100;`);
    }
  };

  const result = runMutation.data;

  return (
    <div className='injection-data'>
      <Panel
        className='injection-data__tree-panel'
        title={<PanelTitle size='base'>Datapack files</PanelTitle>}
      >
        {filesQuery.isLoading ? (
          <SkeletonText />
        ) : filesQuery.isError ? (
          <LoadError
            error={filesQuery.error}
            title='Failed to load datapack files'
          />
        ) : treeFiles.length === 0 ? (
          <EmptyState
            title='Datapack has no files yet'
            description='The injection has not produced any datapack artifacts.'
          />
        ) : (
          <FileTree
            ariaLabel='Datapack files'
            files={treeFiles}
            selectedPath={selectedPath}
            onSelect={selectFile}
          />
        )}
      </Panel>

      <div className='injection-data__work'>
        <Panel
          title={<PanelTitle size='base'>SQL</PanelTitle>}
          extra={
            <Button
              tone='primary'
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate(sql)}
            >
              {runMutation.isPending ? 'Running…' : 'Run query'}
            </Button>
          }
        >
          <div className='page-stack'>
            {schemaQuery.isError && (
              <Chip tone='warning'>
                {`Table and column completion is unavailable: ${errMsg(schemaQuery.error)}`}
              </Chip>
            )}
            <CodeEditor
              value={sql}
              onChange={setSql}
              language='sql'
              tables={tables}
              fields={fields}
              onSubmit={(raw) => runMutation.mutate(raw)}
              height='calc(var(--space-16) * 3.5)'
            />
            {result && (
              <div className='injection-data__stats'>
                <MonoValue size='sm'>{`${String(result.rows.length)} rows`}</MonoValue>
                <MonoValue size='sm'>{`${String(result.elapsedMs)} ms`}</MonoValue>
              </div>
            )}
          </div>
        </Panel>

        <Panel title={<PanelTitle size='base'>Result</PanelTitle>}>
          {runMutation.isError ? (
            <ErrorState
              size='compact'
              title='Query failed'
              description={errMsg(runMutation.error)}
            />
          ) : result ? (
            <ResultView rows={result.rows} columns={result.columns} />
          ) : (
            <EmptyState
              title='Run a query to see results'
              description='Pick a parquet file or write SQL directly. Cmd/Ctrl+Enter runs it.'
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

export default function InjectionData() {
  const { injectionId } = useParams<{ injectionId: string }>();
  if (injectionId === undefined || !/^\d+$/.test(injectionId)) {
    return (
      <Panel>
        <EmptyState
          title='Open through an injection'
          description='Data belongs to an injection — open it from the injection list.'
        />
      </Panel>
    );
  }
  return <InjectionDataView injectionId={Number(injectionId)} />;
}
