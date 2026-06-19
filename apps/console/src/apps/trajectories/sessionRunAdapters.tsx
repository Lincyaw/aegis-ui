import {
  MonoValue,
  type SessionRunFact,
  type SessionRunMessage,
  type SessionRunSubmission,
  type SessionRunSummary,
  type SessionRunToolCall,
} from '@lincyaw/aegis-ui';

import type { SessionMessage, SessionRow, ToolCallRow } from './api/clickhouse';
import { formatDurationMs, formatTokens } from './conversation';

export type SessionDataState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; messages: SessionMessage[]; tools: ToolCallRow[] };

export function parentKey(row: SessionRow): string {
  return row.parentSessionId || row.sourceSessionId;
}

export function lineageLabel(row: SessionRow): string {
  if (row.lineageKind) {
    return row.lineageKind;
  }
  if (parentKey(row)) {
    return 'child';
  }
  return 'root';
}

function stringify(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function valueSummary(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return stringify(value);
}

export function isToolError(tool: ToolCallRow): boolean {
  if (tool.statusCode === 'STATUS_CODE_ERROR') {
    return true;
  }
  const result = tool.result;
  return (
    result != null &&
    typeof result === 'object' &&
    (result as Record<string, unknown>).is_error === true
  );
}

interface AcceptedSubmission {
  tool: string;
  payload: unknown;
  result: unknown;
}

function acceptedSubmissionFromTools(
  tools: ToolCallRow[],
): AcceptedSubmission | null {
  const submitTools = ['submit_final_report', 'submit_judge_review'];
  for (const tool of [...tools].reverse()) {
    if (!submitTools.includes(tool.tool) || isToolError(tool)) {
      continue;
    }
    return {
      tool: tool.tool,
      payload: tool.args,
      result: tool.result,
    };
  }
  return null;
}

function rootSummary(payload: unknown): string {
  if (payload == null || typeof payload !== 'object') {
    return '';
  }
  const obj = payload as Record<string, unknown>;
  const nodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const roots = Array.isArray(obj.root_causes) ? obj.root_causes : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const raw of nodes) {
    if (raw != null && typeof raw === 'object') {
      const node = raw as Record<string, unknown>;
      if (typeof node.id === 'string') {
        byId.set(node.id, node);
      }
    }
  }
  return roots
    .map((root) => {
      if (typeof root !== 'string') {
        return stringify(root);
      }
      const node = byId.get(root);
      if (!node) {
        return root;
      }
      return `${String(node.subject ?? '')}|${String(node.predicate ?? '')}`;
    })
    .filter(Boolean)
    .join('; ');
}

function submissionSummary(payload: unknown): string {
  const graphSummary = rootSummary(payload);
  if (graphSummary) {
    return graphSummary;
  }
  if (payload == null || typeof payload !== 'object') {
    return valueSummary(payload);
  }
  const obj = payload as Record<string, unknown>;
  const preferred = [
    'verdict',
    'decision',
    'status',
    'is_valid',
    'valid',
    'accepted',
    'reason',
    'reasoning',
    'rationale',
    'summary',
    'comment',
  ];
  const lines = preferred
    .filter((key) => key in obj)
    .map((key) => `${key}: ${valueSummary(obj[key])}`);
  return lines.length > 0 ? lines.join('\n') : stringify(payload);
}

export function toSessionRunSummary(row: SessionRow): SessionRunSummary {
  return {
    lineage: lineageLabel(row),
    startedAt: row.startedAt,
    inputTokens: formatTokens(row.inputTokens),
    outputTokens: formatTokens(row.outputTokens),
  };
}

export function toSessionRunMessages(
  messages: SessionMessage[],
  forkMessageId: string,
): SessionRunMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.payload.role,
    content: message.payload.content,
    highlighted: forkMessageId !== '' && message.id === forkMessageId,
  }));
}

export function toSessionRunFacts(row: SessionRow): SessionRunFact[] {
  return [
    {
      key: 'session',
      label: 'session',
      value: <MonoValue size="sm">{row.sessionId}</MonoValue>,
    },
    { key: 'parent', label: 'parent', value: parentKey(row) || '—' },
    { key: 'scenario', label: 'scenario', value: row.scenario || '—' },
    { key: 'lineage', label: 'lineage', value: lineageLabel(row) },
    {
      key: 'fork',
      label: 'fork point',
      value: row.forkMessageId || row.forkTurnIndex || '—',
    },
  ];
}

export function toSessionRunTools(tools: ToolCallRow[]): SessionRunToolCall[] {
  return tools.map((tool) => ({
    id: tool.spanId,
    tool: tool.tool,
    duration: formatDurationMs(tool.durationMs),
    args: tool.args,
    result: tool.result,
    errored: isToolError(tool),
  }));
}

export function toSessionRunSubmission(
  tools: ToolCallRow[],
): SessionRunSubmission | null {
  const submission = acceptedSubmissionFromTools(tools);
  if (submission == null) {
    return null;
  }
  return {
    tool: submission.tool,
    payload: submission.payload,
    result: submission.result,
    summary: submissionSummary(submission.payload),
  };
}
