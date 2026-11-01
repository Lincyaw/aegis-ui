// Single source of truth for the MCP tool catalogue (docs/agent-native-ui.md
// §6.2). Both the TypeScript runtime (`runtime.ts → toMcpTools()`) and the
// Go bridge (`apps/console/server/mcp.go`) consume this list. The Go side
// reads it via a generated JSON file emitted by
// `packages/ui/scripts/emit-mcp-tools.mjs` — never hand-edit the JSON.
//
// To change a tool: edit this file, then run `pnpm gen:mcp-tools` to
// regenerate `apps/console/server/mcp_tools.generated.json`.
import type { McpToolDefinition } from './types';

export const MCP_TOOL_CATALOGUE: McpToolDefinition[] = [
  {
    name: 'aegis_snapshot',
    description:
      'Read the current UI snapshot (shell + surfaces + selection + appData).',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional projection paths to keep the payload small.',
        },
      },
    },
  },
  {
    name: 'aegis_inspect',
    description:
      'Noun-first discovery: returns the target plus actions bound to it.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: {
          type: 'object',
          description:
            'AegisRef — { kind: "surface"|"entity"|"action"|"route", ... }',
        },
      },
      required: ['ref'],
    },
  },
  {
    name: 'aegis_search',
    description:
      'Free-text search across snapshot + registered providers. Returns ranked refs.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        kinds: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['surface', 'entity', 'action', 'route'],
          },
        },
        appId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['query'],
    },
  },
  {
    name: 'aegis_invoke',
    description:
      'The only write entry. Dispatches an action by id with optional params, force, dryRun.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        params: {},
        force: { type: 'boolean' },
        dryRun: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
  {
    name: 'aegis_navigate',
    description:
      'Navigate to a route inside the current app shell. Sugar for aegis_invoke("aegis.navigate", { to }).',
    inputSchema: {
      type: 'object',
      properties: { to: { type: 'string' } },
      required: ['to'],
    },
  },
  {
    name: 'aegis_highlight',
    description:
      'Scroll a target into view and apply a transient ring. Use to point the user.',
    inputSchema: {
      type: 'object',
      properties: { ref: { type: 'object' } },
      required: ['ref'],
    },
  },
  {
    name: 'aegis_wait_for',
    description:
      'Block until a JS predicate over `snap` becomes truthy, or timeout.',
    inputSchema: {
      type: 'object',
      properties: {
        predicate: {
          type: 'string',
          description: 'JS expression evaluated as `(snap) => <expr>`.',
        },
        timeoutMs: { type: 'number' },
      },
      required: ['predicate'],
    },
  },
];
