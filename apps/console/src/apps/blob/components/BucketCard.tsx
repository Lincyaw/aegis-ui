import type { ReactElement } from 'react';

import {
  Chip,
  formatBytes,
  MonoValue,
  Panel,
  StatBlock,
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
  const keeps =
    bucket.retention_days !== undefined && bucket.retention_days > 0
      ? bucket.retention_days
      : null;
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
      <div className='blob-bucket-card__stats'>
        <StatBlock direction='vertical' label='Max object' value={maxObject} />
        <StatBlock
          direction='vertical'
          label='Retention'
          value={keeps ?? 'Kept'}
          unit={keeps === null ? undefined : 'days'}
        />
      </div>
    </Panel>
  );
}
