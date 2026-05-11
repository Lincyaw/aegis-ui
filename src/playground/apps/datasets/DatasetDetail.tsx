import { type ReactElement, useMemo } from 'react';

import { Link, Navigate, useParams } from 'react-router-dom';

import { Chip } from '../../../components/ui/Chip';
import { CodeBlock } from '../../../components/ui/CodeBlock';
import { KeyValueList } from '../../../components/ui/KeyValueList';
import { MetricCard } from '../../../components/ui/MetricCard';
import { MonoValue } from '../../../components/ui/MonoValue';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Panel } from '../../../components/ui/Panel';
import { useDatasets } from './store';

export function DatasetDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const { datasets } = useDatasets();
  const ds = datasets.find((d) => d.id === id);

  const previewSnippet = useMemo(() => {
    if (!ds) {
      return '';
    }
    if (ds.format === 'csv') {
      return [
        'id,service,status,latency_ms',
        '1,frontend,OK,42',
        '2,cart,ERR,1180',
        '3,payment,OK,77',
      ].join('\n');
    }
    if (ds.format === 'jsonl') {
      return [
        '{"trace":"abcd","service":"frontend","status":"OK","ms":42}',
        '{"trace":"abce","service":"cart","status":"ERR","ms":1180}',
      ].join('\n');
    }
    return '/* binary parquet — preview unavailable. */';
  }, [ds]);

  if (!ds) {
    return <Navigate to=".." replace />;
  }

  return (
    <>
      <PageHeader
        title={ds.name}
        description={ds.description}
        action={<Link to="..">← Back</Link>}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-3)',
        }}
      >
        <MetricCard label="Rows" value={ds.rows.toLocaleString()} />
        <MetricCard label="Size" value={`${ds.sizeMb} MB`} />
        <MetricCard label="Format" value={ds.format.toUpperCase()} />
      </div>

      <Panel title="Metadata">
        <KeyValueList
          items={[
            { k: 'id', v: <MonoValue size="sm">{ds.id}</MonoValue> },
            { k: 'format', v: <MonoValue size="sm">{ds.format}</MonoValue> },
            { k: 'rows', v: ds.rows.toLocaleString() },
            { k: 'sizeMb', v: `${ds.sizeMb} MB` },
            { k: 'updatedAt', v: new Date(ds.updatedAt).toLocaleString() },
            {
              k: 'tags',
              v: (
                <span
                  style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}
                >
                  {ds.tags.map((t) => (
                    <Chip key={t} tone="default">
                      {t}
                    </Chip>
                  ))}
                </span>
              ),
            },
          ]}
        />
      </Panel>

      <Panel title="Preview">
        <CodeBlock code={previewSnippet} language="text" />
      </Panel>
    </>
  );
}
