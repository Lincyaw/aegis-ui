// The tools the console's MCP bridge serves, each schema beside the handler
// that runs it in the page. `pnpm gen:mcp-tools` writes the schemas to
// apps/console/server/mcp_tools.generated.json for the Go server; the
// script evaluates this module on its own, so it may import types only.
import type { AegisRuntime } from '../agent/core/runtime';
import type { AegisRef, AegisWaitCondition } from '../agent/core/types';

type ToolParams = Record<string, unknown>;

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (
    runtime: AegisRuntime,
    params: ToolParams,
    signal: AbortSignal,
  ) => unknown;
}

/** Sent to the agent as a `tool.error` with this code. */
export class McpToolError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const REF_KINDS: ReadonlyArray<AegisRef['kind']> = [
  'surface',
  'entity',
  'action',
  'route',
];

const REF_SCHEMA = {
  type: 'object',
  description:
    'A ref from aegis_snapshot or aegis_search: { kind: "surface", surfaceId } | { kind: "entity", entityId, surfaceId? } | { kind: "action", actionId } | { kind: "route", appId, pathname }.',
  properties: {
    kind: { type: 'string', enum: REF_KINDS },
    surfaceId: { type: 'string' },
    entityId: { type: 'string' },
    actionId: { type: 'string' },
    appId: { type: 'string' },
    pathname: { type: 'string' },
  },
  required: ['kind'],
};

function invalid(message: string): McpToolError {
  return new McpToolError('invalid_params', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(params: ToolParams, key: string): string {
  const value = params[key];
  if (typeof value !== 'string' || value === '') {
    throw invalid(`"${key}" must be a non-empty string`);
  }
  return value;
}

function optionalString(params: ToolParams, key: string): string | undefined {
  const value = params[key];
  if (value === undefined || typeof value === 'string') {
    return value;
  }
  throw invalid(`"${key}" must be a string`);
}

function optionalNumber(params: ToolParams, key: string): number | undefined {
  const value = params[key];
  if (
    value === undefined ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value;
  }
  throw invalid(`"${key}" must be a number`);
}

function optionalPositiveInteger(
  params: ToolParams,
  key: string,
): number | undefined {
  const value = params[key];
  if (
    value === undefined ||
    (typeof value === 'number' && Number.isInteger(value) && value > 0)
  ) {
    return value;
  }
  throw invalid(`"${key}" must be a positive integer`);
}

function optionalBoolean(params: ToolParams, key: string): boolean | undefined {
  const value = params[key];
  if (value === undefined || typeof value === 'boolean') {
    return value;
  }
  throw invalid(`"${key}" must be a boolean`);
}

function parseRef(value: unknown): AegisRef {
  if (!isRecord(value)) {
    throw invalid('"ref" must be an object');
  }
  switch (value.kind) {
    case 'surface':
      return { kind: 'surface', surfaceId: requireString(value, 'surfaceId') };
    case 'entity':
      return {
        kind: 'entity',
        entityId: requireString(value, 'entityId'),
        surfaceId: optionalString(value, 'surfaceId'),
      };
    case 'action':
      return { kind: 'action', actionId: requireString(value, 'actionId') };
    case 'route':
      return {
        kind: 'route',
        appId: requireString(value, 'appId'),
        pathname: requireString(value, 'pathname'),
      };
    default:
      throw invalid(`"ref.kind" must be one of ${REF_KINDS.join(', ')}`);
  }
}

function parseKinds(value: unknown): Array<AegisRef['kind']> | undefined {
  if (value === undefined) {
    return undefined;
  }
  const kinds: Array<AegisRef['kind']> = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      const kind = REF_KINDS.find((k) => k === item);
      if (kind === undefined) {
        break;
      }
      kinds.push(kind);
    }
    if (kinds.length === value.length) {
      return kinds;
    }
  }
  throw invalid(`"kinds" must list some of ${REF_KINDS.join(', ')}`);
}

function parseCondition(value: unknown): AegisWaitCondition {
  if (!isRecord(value)) {
    throw invalid('"condition" must be an object');
  }
  const { kind } = value;
  switch (kind) {
    case 'present':
    case 'absent': {
      const ref = parseRef(value.ref);
      if (ref.kind === 'route') {
        throw invalid('wait for a route with { kind: "route", pathname }');
      }
      return { kind, ref };
    }
    case 'route':
      return { kind: 'route', pathname: requireString(value, 'pathname') };
    case 'text':
      return {
        kind: 'text',
        text: requireString(value, 'text'),
        surfaceId: optionalString(value, 'surfaceId'),
      };
    case 'field': {
      const expected = value.value;
      if (
        expected !== null &&
        typeof expected !== 'string' &&
        typeof expected !== 'number' &&
        typeof expected !== 'boolean'
      ) {
        throw invalid('"value" must be a string, number, boolean or null');
      }
      return {
        kind: 'field',
        surfaceId: requireString(value, 'surfaceId'),
        name: requireString(value, 'name'),
        value: expected,
      };
    }
    default:
      throw invalid(
        '"condition.kind" must be one of present, absent, route, text, field',
      );
  }
}

async function dispatchAsAgent(
  runtime: AegisRuntime,
  id: string,
  params: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  const result = await runtime.dispatch(id, params, { by: 'agent', signal });
  if (!result.ok) {
    throw new McpToolError(result.error.code, result.error.message);
  }
  return result;
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'aegis_snapshot',
    description:
      'Read the current UI: the shell (app, route, theme, viewport), every surface on the page with its projected entities and fields and the ids of the actions bound to it, and the selection.',
    inputSchema: { type: 'object', properties: {} },
    run: (runtime) => runtime.snapshot(),
  },
  {
    name: 'aegis_inspect',
    description:
      'Noun-first discovery: returns the target plus the actions bound to it. Fails with not_found when the target is not on the page.',
    inputSchema: {
      type: 'object',
      properties: { ref: REF_SCHEMA },
      required: ['ref'],
    },
    run: (runtime, params) => {
      const result = runtime.inspect(parseRef(params.ref));
      if (!result) {
        throw new McpToolError('not_found', 'inspect: target not found');
      }
      return result;
    },
  },
  {
    name: 'aegis_search',
    description:
      'Free-text search across the snapshot and the search providers the page registered. Returns ranked refs in `results`; `failedProviders` names providers that failed, whose hits are missing.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        kinds: { type: 'array', items: { type: 'string', enum: REF_KINDS } },
        appId: { type: 'string' },
        limit: { type: 'integer', minimum: 1 },
      },
      required: ['query'],
    },
    run: (runtime, params, signal) => {
      const { query } = params;
      if (typeof query !== 'string') {
        throw invalid('"query" must be a string');
      }
      return runtime.search(query, {
        kinds: parseKinds(params.kinds),
        appId: optionalString(params, 'appId'),
        limit: optionalPositiveInteger(params, 'limit'),
        signal,
      });
    },
  },
  {
    name: 'aegis_invoke',
    description:
      'The only write entry: runs a registered action by id, with optional params, as the agent. With dryRun: true nothing runs; it returns the action, the params and the action\'s own preview when it has one. Fails with unavailable for actions only the user may invoke (invocableBy: "user") and with needs_confirm for actions marked confirm.danger: the user has to run those, so point at the control with aegis_highlight. An action that fails comes back as a tool error.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        params: {},
        dryRun: { type: 'boolean' },
      },
      required: ['id'],
    },
    run: async (runtime, params, signal) => {
      const id = requireString(params, 'id');
      if (optionalBoolean(params, 'dryRun') !== true) {
        return dispatchAsAgent(runtime, id, params.params, signal);
      }
      const preview = await runtime.preview(id, params.params, {
        by: 'agent',
        signal,
      });
      if (!preview.ok) {
        throw new McpToolError(preview.error.code, preview.error.message);
      }
      return preview;
    },
  },
  {
    name: 'aegis_navigate',
    description:
      'Navigate to a path inside the console, such as /portal/datasets. `to` is a path like shell.route.pathname in the snapshot, and a relative path resolves from the current route as a URL path does (x from /gallery goes to /x). Prefer paths: a full URL must be on the origin of the page and fails with invalid_params when the base path of the app is unknown, as does a URL on another origin or a javascript:, data: or blob: URL. Sugar for aegis_invoke("aegis.navigate", { to }).',
    inputSchema: {
      type: 'object',
      properties: { to: { type: 'string' } },
      required: ['to'],
    },
    run: (runtime, params, signal) =>
      dispatchAsAgent(
        runtime,
        'aegis.navigate',
        { to: requireString(params, 'to') },
        signal,
      ),
  },
  {
    name: 'aegis_highlight',
    description:
      'Scroll a surface, entity or action into view and ring it briefly, to point the user at it. Returns found: false when it is not on the page.',
    inputSchema: {
      type: 'object',
      properties: { ref: REF_SCHEMA },
      required: ['ref'],
    },
    run: (runtime, params) => runtime.highlight(parseRef(params.ref)),
  },
  {
    name: 'aegis_wait_for',
    description:
      'Wait until a condition holds, then return the snapshot; fails with timeout otherwise. Conditions: present / absent (ref is a surface, entity or action ref), route (the shell pathname equals pathname), text (text appears, case-insensitively, in a surface label, entity or field; only in surfaceId when given), field (field name on surface surfaceId equals value).',
    inputSchema: {
      type: 'object',
      properties: {
        condition: {
          type: 'object',
          description:
            '{ kind: "present" | "absent", ref } | { kind: "route", pathname } | { kind: "text", text, surfaceId? } | { kind: "field", surfaceId, name, value }.',
          properties: {
            kind: {
              type: 'string',
              enum: ['present', 'absent', 'route', 'text', 'field'],
            },
            ref: REF_SCHEMA,
            pathname: { type: 'string' },
            text: { type: 'string' },
            surfaceId: { type: 'string' },
            name: { type: 'string' },
            value: { type: ['string', 'number', 'boolean', 'null'] },
          },
          required: ['kind'],
        },
        timeoutMs: {
          type: 'number',
          minimum: 0,
          maximum: 20000,
          description: 'Defaults to 5000; longer waits are cut to 20000.',
        },
      },
      required: ['condition'],
    },
    run: (runtime, params, signal) =>
      runtime.waitFor(parseCondition(params.condition), {
        timeoutMs: optionalNumber(params, 'timeoutMs'),
        signal,
      }),
  },
];
