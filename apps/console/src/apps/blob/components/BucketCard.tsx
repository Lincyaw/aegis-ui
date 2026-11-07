import type { ReactElement } from 'react';

import {
  Chip,
  formatBytes,
  MetricLabel,
  MonoValue,
  Panel,
} from '@lincyaw/aegis-ui';

import type { BucketSummary } from '../../../api/blobClient';
import { RouterLink } from '../../shared/RouterLink';

import './BucketCard.css';

interface BucketCardProps {
  bucket: BucketSummary;
  to: string;
}

export function BucketCard({ bucket, to }: BucketCardProps): ReactElement {
  const maxObject =
    bucket.max_object_bytes !== undefined && bucket.max_object_bytes > 0
      ? formatBytes(bucket.max_object_bytes)
      : 'No limit';
  const retention =
    bucket.retention_days !== undefined && bucket.retention_days > 0
      ? `${bucket.retention_days.toString()} days`
      : 'Kept';
  return (
    <Panel
      title={<MonoValue size='lg'>{bucket.name}</MonoValue>}
      to={to}
      linkComponent={RouterLink}
      extra={
        <>
          {bucket.public_read ? <Chip tone='caution'>public</Chip> : null}
          <Chip tone='ghost'>{bucket.driver}</Chip>
        </>
      }
    >
      <dl className='blob-bucket-card__stats'>
        <div className='blob-bucket-card__stat'>
          <dt>
            <MetricLabel>Max object</MetricLabel>
          </dt>
          <dd className='blob-bucket-card__value'>{maxObject}</dd>
        </div>
        <div className='blob-bucket-card__stat'>
          <dt>
            <MetricLabel>Retention</MetricLabel>
          </dt>
          <dd className='blob-bucket-card__value'>{retention}</dd>
        </div>
      </dl>
    </Panel>
  );
}
