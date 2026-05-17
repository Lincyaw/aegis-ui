import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  Button,
  CodeEditor,
  type CodeEditorField,
  EmptyState,
  ErrorState,
  MonoValue,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';
import type { InjectionDatapackFileItem } from '@lincyaw/portal';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  DatapackQueryError,
  getDatapackSchema,
  listDatapackFiles,
  runDatapackQuery,
} from '../../api/datapack';

import { FileTreePane } from './FileTreePane';
import { ResultView } from './ResultView';
import './InjectionData.css';

const DEFAULT_SQL = '-- Cmd/Ctrl+Enter to run\nSELECT 1 AS hello;';

export default function InjectionData() {
  const { injectionId } = useParams<{ injectionId: string }>();
  const idNum = injectionId !== undefined && /^\d+$/.test(injectionId)
    ? Number(injectionId)
    : null;

  const [sql, setSql] = useState<string>(DEFAULT_SQL);
  const [selectedPath, setSelectedPath] = useState<string | undefined>();

  const filesQuery = useQuery({
    queryKey: ['portal', 'datapack-files', idNum],
    enabled: idNum !== null,
    queryFn: () => listDatapackFiles(idNum as number),
  });

  const schemaQuery = useQuery({
    queryKey: ['portal', 'datapack-schema', idNum],
    enabled: idNum !== null,
    queryFn: () => getDatapackSchema(idNum as number),
    retry: false,
  });

  const runMutation = useMutation({
    mutationFn: (raw: string) => runDatapackQuery(idNum as number, raw),
  });

  const tables = useMemo(
    () => schemaQuery.data?.tables.map((t) => t.name) ?? [],
    [schemaQuery.data],
  );
  const fields: CodeEditorField[] = useMemo(() => {
    if (!schemaQuery.data) {
      return [];
    }
    const out: CodeEditorField[] = [];
    const seen = new Set<string>();
    for (const t of schemaQuery.data.tables) {
      for (const c of t.columns) {
        if (!seen.has(c.name)) {
          seen.add(c.name);
          out.push({ name: c.name, type: c.type });
        }
      }
    }
    return out;
  }, [schemaQuery.data]);

  const handleSelectFile = (item: InjectionDatapackFileItem): void => {
    setSelectedPath(item.path);
    if (item.name !== undefined && /\.parquet$/i.test(item.name)) {
      const tableName = item.name.replace(/\.parquet$/i, '');
      setSql(`SELECT * FROM "${tableName}" LIMIT 100;`);
    }
  };

  const handleRun = (raw: string): void => {
    if (idNum === null) {
      return;
    }
    runMutation.mutate(raw);
  };

  if (idNum === null) {
    return (
      <Panel>
        <EmptyState
          title='Open through an injection'
          description='Data is scoped to an injection — reach this view via /portal/injections/:id/data.'
        />
      </Panel>
    );
  }

  const result = runMutation.data;

  return (
    <div className='injection-data'>
      <Panel className='injection-data__tree-panel'>
        <PanelTitle>Datapack files</PanelTitle>
        <FileTreePane
          data={filesQuery.data}
          isLoading={filesQuery.isLoading}
          error={filesQuery.isError ? filesQuery.error : undefined}
          selectedPath={selectedPath}
          onSelect={handleSelectFile}
        />
      </Panel>

      <div className='injection-data__work'>
        <Panel>
          <div className='injection-data__editor-head'>
            <PanelTitle>SQL</PanelTitle>
            <div className='injection-data__editor-actions'>
              <span className='injection-data__hint'>Cmd/Ctrl+Enter to run</span>
              <Button
                tone='primary'
                disabled={runMutation.isPending}
                onClick={() => {
                  handleRun(sql);
                }}
              >
                {runMutation.isPending ? 'Running…' : 'Run query'}
              </Button>
            </div>
          </div>
          <CodeEditor
            value={sql}
            onChange={setSql}
            language='sql'
            tables={tables}
            fields={fields}
            onSubmit={handleRun}
            height={220}
          />
          {result && (
            <div className='injection-data__stats'>
              <MonoValue size='sm'>{`${String(result.rows.length)} rows`}</MonoValue>
              <MonoValue size='sm'>{`${String(result.elapsedMs)} ms`}</MonoValue>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelTitle>Result</PanelTitle>
          {runMutation.isError ? (
            <ErrorState
              title={
                runMutation.error instanceof DatapackQueryError &&
                runMutation.error.isBackendMissing
                  ? 'Backend /datapack-query not deployed yet'
                  : 'Query failed'
              }
              description={
                runMutation.error instanceof Error
                  ? runMutation.error.message
                  : String(runMutation.error)
              }
            />
          ) : !result ? (
            <EmptyState
              title='Run a query to see results'
              description='Pick a parquet file on the left or write SQL directly.'
            />
          ) : (
            <ResultView rows={result.rows} columns={result.columns} />
          )}
        </Panel>
      </div>
    </div>
  );
}
