import {
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  MetricLabel,
  Panel,
  PanelTitle,
  PasswordField,
  TextField,
} from '@lincyaw/aegis-ui';

import {
  clearLocalOverride,
  DEFAULTS,
  getLocalOverride,
  getRuntimeConfig,
  setLocalOverride,
} from '../../../config/runtime';

import './Endpoints.css';

interface FieldDef {
  key: keyof ReturnType<typeof getRuntimeConfig>;
  label: string;
  placeholder: string;
  hint: string;
  secret?: boolean;
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
  {
    key: 'clickhouseTracesTable',
    label: 'ClickHouse traces table',
    placeholder: 'otel_traces',
    hint: 'Table holding OTel span rows. Default: otel_traces.',
  },
  {
    key: 'clickhouseLogsTable',
    label: 'ClickHouse logs table',
    placeholder: 'otel_logs',
    hint: 'Table holding AgentM session logs and message bodies. Default: otel_logs.',
  },
  {
    key: 'agentmUrl',
    label: 'AgentM gateway URL',
    placeholder: 'ws://127.0.0.1:7777/agentm',
    hint: 'WebSocket endpoint of the AgentM gateway behind the AI assistant. Empty hides the assistant.',
  },
  {
    key: 'agentmToken',
    label: 'AgentM token',
    placeholder: '(none)',
    hint: 'Token sent to the AgentM gateway, if it requires one. Stored only in this browser (localStorage); never injected from /config.js.',
    secret: true,
  },
];

export default function Endpoints(): ReactElement {
  const nav = useNavigate();
  const current = getRuntimeConfig();
  const [draft, setDraft] = useState<Record<string, string>>({
    gatewayUrl: current.gatewayUrl,
    ssoOrigin:
      current.ssoOrigin === current.gatewayUrl ? '' : current.ssoOrigin,
    clickhouseUrl: current.clickhouseUrl,
    clickhouseDatabase: current.clickhouseDatabase,
    clickhouseTracesTable: current.clickhouseTracesTable,
    clickhouseLogsTable: current.clickhouseLogsTable,
    agentmUrl: current.agentmUrl,
    agentmToken: current.agentmToken,
  });
  const [saved, setSaved] = useState(false);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    setLocalOverride({
      gatewayUrl: draft.gatewayUrl?.trim() ?? '',
      ssoOrigin: draft.ssoOrigin?.trim() ?? '',
      clickhouseUrl: draft.clickhouseUrl?.trim() ?? '',
      clickhouseDatabase:
        draft.clickhouseDatabase?.trim() || DEFAULTS.clickhouseDatabase,
      clickhouseTracesTable:
        draft.clickhouseTracesTable?.trim() || DEFAULTS.clickhouseTracesTable,
      clickhouseLogsTable:
        draft.clickhouseLogsTable?.trim() || DEFAULTS.clickhouseLogsTable,
      agentmUrl: draft.agentmUrl?.trim() ?? '',
      agentmToken: draft.agentmToken ?? '',
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
          {overridden
            ? 'localStorage override active'
            : 'using /config.js defaults'}
        </MetricLabel>
      }
    >
      <form onSubmit={submit} className='endpoints-form'>
        {FIELDS.map((f) => {
          const fieldProps = {
            label: f.label,
            helperText: f.hint,
            placeholder: f.placeholder,
            value: draft[f.key] ?? '',
            onChange: (e: ChangeEvent<HTMLInputElement>) => {
              setDraft((d) => ({ ...d, [f.key]: e.target.value }));
            },
          };
          return f.secret ? (
            <PasswordField key={f.key} {...fieldProps} />
          ) : (
            <TextField key={f.key} {...fieldProps} />
          );
        })}
        <div className='endpoints-form__actions'>
          <Button type='submit'>
            {saved ? 'Saved · reloading' : 'Save & reload'}
          </Button>
          {overridden && (
            <Button tone='secondary' onClick={reset}>
              Reset to defaults
            </Button>
          )}
          <Button tone='secondary' onClick={() => nav(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}
