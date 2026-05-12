import { type FormEvent, type ReactElement, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Chip,
  MetricLabel,
  Panel,
  PanelTitle,
} from '@lincyaw/aegis-ui';

import {
  clearLocalOverride,
  getLocalOverride,
  getRuntimeConfig,
  setLocalOverride,
} from '../config/runtime';

interface FieldDef {
  key: keyof ReturnType<typeof getRuntimeConfig>;
  label: string;
  placeholder: string;
  hint: string;
}

const FIELDS: FieldDef[] = [
  {
    key: 'gatewayUrl',
    label: 'Gateway URL',
    placeholder: 'https://gateway.example.com',
    hint: 'Base URL for /api, /v1, /authorize. Empty = same origin (co-located deploy or vite proxy).',
  },
  {
    key: 'ssoOrigin',
    label: 'SSO origin',
    placeholder: '(falls back to gateway URL)',
    hint: 'Optional explicit SSO origin. Leave empty to reuse the gateway URL.',
  },
  {
    key: 'clickhouseUrl',
    label: 'ClickHouse URL',
    placeholder: 'http://localhost:8123',
    hint: 'Direct ClickHouse HTTP endpoint for the trajectories viewer. Empty = use gateway proxy.',
  },
  {
    key: 'clickhouseDatabase',
    label: 'ClickHouse database',
    placeholder: 'otel',
    hint: 'Database holding otel_traces. Default: otel.',
  },
];

export function Setup(): ReactElement {
  const nav = useNavigate();
  const current = getRuntimeConfig();
  const [draft, setDraft] = useState<Record<string, string>>({
    gatewayUrl: current.gatewayUrl,
    ssoOrigin: current.ssoOrigin === current.gatewayUrl ? '' : current.ssoOrigin,
    clickhouseUrl: current.clickhouseUrl,
    clickhouseDatabase: current.clickhouseDatabase,
  });
  const [saved, setSaved] = useState(false);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    setLocalOverride({
      gatewayUrl: draft.gatewayUrl?.trim() ?? '',
      ssoOrigin: draft.ssoOrigin?.trim() ?? '',
      clickhouseUrl: draft.clickhouseUrl?.trim() ?? '',
      clickhouseDatabase: draft.clickhouseDatabase?.trim() || 'otel',
    });
    setSaved(true);
    window.setTimeout(() => {
      window.location.assign('/');
    }, 400);
  };

  const reset = (): void => {
    clearLocalOverride();
    window.location.reload();
  };

  const overridden = Object.keys(getLocalOverride()).length > 0;

  return (
    <Panel
      title={<PanelTitle size='lg'>Connection</PanelTitle>}
      extra={
        <MetricLabel>
          {overridden ? 'localStorage override active' : 'using /config.js defaults'}
        </MetricLabel>
      }
    >
      <form
        onSubmit={submit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          maxWidth: 640,
        }}
      >
        {FIELDS.map((f) => (
          <label
            key={f.key}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}
          >
            <span style={{ font: 'var(--text-label)' }}>{f.label}</span>
            <input
              type='text'
              value={draft[f.key] ?? ''}
              placeholder={f.placeholder}
              onChange={(e) => {
                setDraft((d) => ({ ...d, [f.key]: e.target.value }));
              }}
              style={{
                font: 'var(--text-body-mono)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
            <span
              style={{
                font: 'var(--text-caption)',
                color: 'var(--text-secondary)',
              }}
            >
              {f.hint}
            </span>
          </label>
        ))}
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <Chip tone='ink' onClick={() => submit(new Event('submit') as unknown as FormEvent)}>
            {saved ? 'Saved · reloading' : 'Save & reload'}
          </Chip>
          {overridden && (
            <Chip tone='warning' onClick={reset}>
              Reset to defaults
            </Chip>
          )}
          <Chip tone='ghost' onClick={() => nav(-1)}>
            Cancel
          </Chip>
        </div>
      </form>
    </Panel>
  );
}

export default Setup;
