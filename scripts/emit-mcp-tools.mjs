#!/usr/bin/env node
/**
 * Writes apps/console/server/mcp_tools.generated.json, the tool list the
 * console's Go MCP server embeds, from the tool table in
 * packages/ui/src/transports/mcpTools.ts. With `--check` it writes nothing
 * and exits 1 when the committed file differs.
 *
 *   pnpm gen:mcp-tools     # regenerate
 *   pnpm check:mcp-tools   # verify (part of `pnpm check`)
 *
 * The table module is transpiled on its own and imported from a data: URL,
 * so it may import types only.
 */
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'packages/ui/src/transports/mcpTools.ts';
const outPath = 'apps/console/server/mcp_tools.generated.json';
const check = process.argv.includes('--check');

const source = await fs.readFile(join(repoRoot, sourcePath), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: 'mcpTools.ts',
});
if (/^\s*import\s/m.test(outputText)) {
  console.error(
    `[mcp-tools] ${sourcePath} has a runtime import; it may import types only.`,
  );
  process.exit(2);
}

const mod = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
if (!Array.isArray(mod.MCP_TOOLS) || mod.MCP_TOOLS.length === 0) {
  console.error(`[mcp-tools] ${sourcePath} exports no MCP_TOOLS`);
  process.exit(2);
}

const payload = {
  _generated: true,
  _source: sourcePath,
  _regenerate: 'pnpm gen:mcp-tools',
  tools: mod.MCP_TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
};
const json = `${JSON.stringify(payload, null, 2)}\n`;
const target = join(repoRoot, outPath);

if (check) {
  let current = null;
  try {
    current = await fs.readFile(target, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  if (current !== json) {
    console.error(
      `[mcp-tools] ${outPath} is out of date; run pnpm gen:mcp-tools and commit it.`,
    );
    process.exit(1);
  }
  console.log(`[mcp-tools] ${outPath} is up to date`);
} else {
  await fs.writeFile(target, json, 'utf8');
  console.log(
    `[mcp-tools] wrote ${String(payload.tools.length)} tools to ${outPath}`,
  );
}
