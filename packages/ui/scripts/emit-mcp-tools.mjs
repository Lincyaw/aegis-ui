#!/usr/bin/env node
// Emits apps/console/server/mcp_tools.generated.json from the TypeScript
// source of truth at packages/ui/src/agent/mcpToolCatalogue.ts.
//
// Strategy: load the project-local `typescript` devDep, transpile the
// catalogue file (which only imports `type` from sibling files, so it has
// zero runtime deps), then dynamic-import the result via a data: URL.
// Output is JSON.stringified with a stable 2-space indent so re-runs are
// byte-identical.
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const catalogueTs = join(here, '..', 'src', 'agent', 'mcpToolCatalogue.ts');
const outPath = join(
  repoRoot,
  'apps',
  'console',
  'server',
  'mcp_tools.generated.json',
);

const ts = (await import('typescript')).default;

const source = await fs.readFile(catalogueTs, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
    isolatedModules: true,
    esModuleInterop: true,
    verbatimModuleSyntax: false,
  },
  fileName: 'mcpToolCatalogue.ts',
});

const dataUrl =
  'data:text/javascript;base64,' +
  Buffer.from(transpiled.outputText, 'utf8').toString('base64');
const mod = await import(dataUrl);
const catalogue = mod.MCP_TOOL_CATALOGUE;
if (!Array.isArray(catalogue) || catalogue.length === 0) {
  console.error('[emit-mcp-tools] MCP_TOOL_CATALOGUE missing or empty');
  process.exit(2);
}

const payload = {
  _generated: true,
  _source: 'packages/ui/src/agent/mcpToolCatalogue.ts',
  _regenerate: 'pnpm gen:mcp-tools',
  tools: catalogue,
};

const json = JSON.stringify(payload, null, 2) + '\n';
await fs.writeFile(outPath, json, 'utf8');
console.log(
  `[emit-mcp-tools] wrote ${String(catalogue.length)} tool(s) to ${outPath}`,
);
