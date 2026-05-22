/**
 * Top-of-page connection status banner. Three colour tones map to the
 * three states a reviewer cares about:
 *
 *   - live           → green
 *   - replaying      → amber
 *   - everything else (connecting / closed / error / disconnected)
 *                    → red, with countdown if a reconnect is pending
 */

import { type ReactElement } from 'react';

import { useInspectStore } from '../store/useInspectStream';

import './StatusBanner.css';

export function StatusBanner(): ReactElement | null {
  const status = useInspectStore((s) => s.status);
  const url = useInspectStore((s) => s.url);
  const errorMessage = useInspectStore((s) => s.errorMessage);
  const reconnectInMs = useInspectStore((s) => s.reconnectInMs);
  const schemaMismatch = useInspectStore((s) => s.inspect.schemaMismatch);
  const truncatedCount = useInspectStore((s) => s.inspect.truncatedSessions.size);

  if (status === 'disconnected' && !url) {
    return null;
  }

  let tone: 'green' | 'amber' | 'red' = 'red';
  let label = '';
  switch (status) {
    case 'live':
      tone = 'green';
      label = 'live';
      break;
    case 'replaying_backlog':
      tone = 'amber';
      label = 'replaying backlog…';
      break;
    case 'connecting':
      tone = 'amber';
      label = 'connecting…';
      break;
    case 'closed':
    case 'error': {
      tone = 'red';
      const remaining = reconnectInMs;
      label =
        remaining !== null
          ? `disconnected — retrying in ${Math.max(0, Math.ceil(remaining / 1000)).toString()}s`
          : 'disconnected';
      break;
    }
    default:
      tone = 'red';
      label = 'disconnected';
  }

  return (
    <div className={`lh-banner lh-banner--${tone}`}>
      <span className='lh-banner__dot' />
      <span className='lh-banner__label'>{label}</span>
      {schemaMismatch && (
        <span className='lh-banner__warn'>
          schema_version mismatch — frames may be misinterpreted
        </span>
      )}
      {truncatedCount > 0 && (
        <span className='lh-banner__warn'>
          {truncatedCount.toString()} session
          {truncatedCount === 1 ? '' : 's'} truncated at 5000 items
        </span>
      )}
      {errorMessage && status !== 'live' && (
        <span className='lh-banner__error'>{errorMessage}</span>
      )}
    </div>
  );
}
