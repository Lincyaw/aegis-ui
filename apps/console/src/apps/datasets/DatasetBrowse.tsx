import { type ReactElement, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Chip,
  EmptyState,
  MonoValue,
  PageHeader,
  Panel,
  Tabs,
  TimeDisplay,
} from '@lincyaw/aegis-ui';

import type { DemoDataset } from './data';
import { useDatasets } from './store';

type FormatTab = 'all' | DemoDataset['format'];

export function DatasetBrowse(): ReactElement {
  const { datasets } = useDatasets();
  const [tab, setTab] = useState<FormatTab>('all');

  const filtered = useMemo(
    () => (tab === 'all' ? datasets : datasets.filter((d) => d.format === tab)),
    [datasets, tab]
  );

  return (
    <>
      <PageHeader
        title='Datasets'
        description='Browse what the demo control plane has registered for analysis.'
        action={<Link to='upload'>+ Upload</Link>}
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
          <EmptyState title='No datasets in this tab' />
        ) : (
          <div className='datasets-list'>
            {filtered.map((d) => (
              <Link key={d.id} to={d.id} className='datasets-row'>
                <div className='datasets-row__head'>
                  <strong>{d.name}</strong>
                  <span className='datasets-row__time'>
                    <TimeDisplay value={d.updatedAt} mode='relative' />
                  </span>
                </div>
                <div className='datasets-row__description'>{d.description}</div>
                <div className='datasets-chips'>
                  <Chip tone='ghost'>
                    <MonoValue size='sm'>{d.format}</MonoValue>
                  </Chip>
                  <Chip tone='ghost'>{d.rows.toLocaleString()} rows</Chip>
                  <Chip tone='ghost'>{d.sizeMb} MB</Chip>
                  {d.tags.map((t) => (
                    <Chip key={t} tone='default'>
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
