import { type ReactElement, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { Chip } from '../../../components/ui/Chip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MonoValue } from '../../../components/ui/MonoValue';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Panel } from '../../../components/ui/Panel';
import { Tabs } from '../../../components/ui/Tabs';
import { TimeDisplay } from '../../../components/ui/TimeDisplay';
import type { DemoDataset } from './data';
import { useDatasets } from './store';

type FormatTab = 'all' | DemoDataset['format'];

export function DatasetBrowse(): ReactElement {
  const { datasets } = useDatasets();
  const [tab, setTab] = useState<FormatTab>('all');

  const filtered = useMemo(
    () => (tab === 'all' ? datasets : datasets.filter((d) => d.format === tab)),
    [datasets, tab],
  );

  return (
    <>
      <PageHeader
        title="Datasets"
        description="Browse what the demo control plane has registered for analysis."
        action={<Link to="upload">+ Upload</Link>}
      />

      <Panel>
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as FormatTab)}
          items={[
            { key: 'all', label: `All (${datasets.length})` },
            {
              key: 'parquet',
              label: `Parquet (${datasets.filter((d) => d.format === 'parquet').length})`,
            },
            {
              key: 'csv',
              label: `CSV (${datasets.filter((d) => d.format === 'csv').length})`,
            },
            {
              key: 'jsonl',
              label: `JSONL (${datasets.filter((d) => d.format === 'jsonl').length})`,
            },
          ]}
        />

        {filtered.length === 0 ? (
          <EmptyState title="No datasets in this tab" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((d) => (
              <Link
                key={d.id}
                to={d.id}
                style={{
                  display: 'block',
                  padding: 'var(--space-3) var(--space-4)',
                  borderTop: '1px solid var(--border-hairline)',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 'var(--space-3)',
                  }}
                >
                  <strong>{d.name}</strong>
                  <span
                    style={{
                      fontSize: 'var(--fs-11)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <TimeDisplay value={d.updatedAt} mode="relative" />
                  </span>
                </div>
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 'var(--fs-11)',
                    margin: 'var(--space-1) 0',
                  }}
                >
                  {d.description}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Chip tone="ghost">
                    <MonoValue size="sm">{d.format}</MonoValue>
                  </Chip>
                  <Chip tone="ghost">{d.rows.toLocaleString()} rows</Chip>
                  <Chip tone="ghost">{d.sizeMb} MB</Chip>
                  {d.tags.map((t) => (
                    <Chip key={t} tone="default">
                      {t}
                    </Chip>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
