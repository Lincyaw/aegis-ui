// Lucene → SQL WHERE compilation adapted from HyperDX (MIT, DeploySentinel Inc. 2023):
// https://github.com/hyperdxio/hyperdx/blob/main/packages/common-utils/src/queryParser.ts
//
// The upstream serializer is ~1800 lines and walks an async metadata-aware
// schema. We only need a presentational compiler that emits a parameterised
// ClickHouse WHERE fragment given a static FieldMapping[], so this is a
// trimmed re-implementation of the same AST walk.
import lucene from '@hyperdx/lucene';

export interface FieldMapping {
  /** Lucene field name as typed (e.g. "service.name"). */
  field: string;
  /** ClickHouse column expression (e.g. "ServiceName" or
   *  "SpanAttributes['service.name']"). */
  sqlExpr: string;
  /** Optional kind for type-aware comparisons. Default 'string'. */
  kind?: 'string' | 'number' | 'date' | 'bool';
}

export interface CompileOptions {
  fields: FieldMapping[];
  /** Strict mode: throw on unknown field. Default false (unknown becomes a
   *  no-op and is mentioned in `explanation`). */
  strict?: boolean;
  /** ClickHouse param placeholder prefix (default 'p'). Returned in `params`. */
  paramPrefix?: string;
}

export interface CompileResult {
  /** SQL fragment with `{p0:String}` style placeholders. Empty string if
   *  input parses to no predicates. */
  sql: string;
  /** Parameter object suitable for the ClickHouse client. */
  params: Record<string, string | number | boolean>;
  /** Human-readable explanation. */
  explanation: string;
  /** Set of fields actually referenced in the query. */
  referencedFields: string[];
}

interface CompileCtx {
  options: CompileOptions;
  paramPrefix: string;
  params: Record<string, string | number | boolean>;
  explanationParts: string[];
  referenced: Set<string>;
  fieldMap: Map<string, FieldMapping>;
  unknownFields: Set<string>;
  paramCounter: { n: number };
}

function clickHouseType(kind: FieldMapping['kind']): string {
  switch (kind) {
    case 'number':
      return 'Float64';
    case 'bool':
      return 'UInt8';
    case 'date':
      return 'DateTime64';
    case 'string':
    case undefined:
      return 'String';
  }
}

function coerce(
  raw: string,
  kind: FieldMapping['kind'],
): string | number | boolean {
  switch (kind) {
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : raw;
    }
    case 'bool':
      return raw === 'true' || raw === '1' ? 1 : 0;
    case 'date':
    case 'string':
    case undefined:
      return raw;
  }
}

function addParam(ctx: CompileCtx, value: string | number | boolean): string {
  const name = `${ctx.paramPrefix}${ctx.paramCounter.n}`;
  ctx.paramCounter.n += 1;
  ctx.params[name] = value;
  return name;
}

function placeholder(name: string, chType: string): string {
  return `{${name}:${chType}}`;
}

function unescapeLuceneTerm(term: string): string {
  // Lucene escapes special chars with `\`. Strip them for the value param,
  // but keep wildcards intact (caller decides whether to interpret).
  return term.replace(/\\(.)/g, '$1');
}

function isWildcardTerm(term: string): boolean {
  return /[*?]/.test(term);
}

function luceneWildcardToLike(term: string): string {
  // Lucene `*` → SQL `%`, Lucene `?` → SQL `_`. Escape existing SQL
  // wildcard chars first.
  let out = '';
  for (let i = 0; i < term.length; i++) {
    const ch = term[i];
    if (ch === '\\' && i + 1 < term.length) {
      out += term[i + 1];
      i += 1;
      continue;
    }
    if (ch === '*') {
      out += '%';
    } else if (ch === '?') {
      out += '_';
    } else if (ch === '%' || ch === '_') {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
  }
  return out;
}

function findField(ctx: CompileCtx, name: string): FieldMapping | undefined {
  return ctx.fieldMap.get(name);
}

interface MaybeRange {
  op: '>' | '>=' | '<' | '<=';
  value: string;
}

function parseRangeShorthand(term: string): MaybeRange | undefined {
  // Lucene shorthand: `>1000`, `>=1000`, `<1000`, `<=1000`. Standard Lucene
  // grammar maps these via parser; @hyperdx/lucene parses `>1000` as a term
  // string starting with the symbol, so handle it inline.
  const m = /^(>=|<=|>|<)(.+)$/.exec(term);
  if (!m) {
    return undefined;
  }
  return { op: m[1] as MaybeRange['op'], value: m[2] };
}

function compileTerm(ctx: CompileCtx, node: lucene.NodeTerm): string {
  const fieldName = node.field;
  if (fieldName === '<implicit>') {
    // Bare term with no field — no way to map without a schema. Emit a
    // no-op and explain.
    ctx.explanationParts.push(
      `bare term "${node.term}" has no field — skipped`,
    );
    return '';
  }
  const mapping = findField(ctx, fieldName);
  if (!mapping) {
    if (ctx.options.strict) {
      throw new Error(`Unknown field: ${fieldName}`);
    }
    ctx.unknownFields.add(fieldName);
    return '';
  }
  ctx.referenced.add(fieldName);

  const negated = node.prefix === '-' || node.prefix === '!';
  const rawTerm = unescapeLuceneTerm(node.term);
  const chType = clickHouseType(mapping.kind);

  // Range shorthand (`duration:>1000`) — only valid for numeric / date kinds.
  const range = parseRangeShorthand(node.term);
  if (range && (mapping.kind === 'number' || mapping.kind === 'date')) {
    const p = addParam(
      ctx,
      coerce(unescapeLuceneTerm(range.value), mapping.kind),
    );
    const expr = `${mapping.sqlExpr} ${range.op} ${placeholder(p, chType)}`;
    return negated ? `NOT (${expr})` : expr;
  }

  // Wildcard term — only meaningful for strings.
  if (
    isWildcardTerm(node.term) &&
    (mapping.kind === 'string' || mapping.kind === undefined)
  ) {
    const likePattern = luceneWildcardToLike(node.term);
    const p = addParam(ctx, likePattern);
    const expr = `${mapping.sqlExpr} LIKE ${placeholder(p, 'String')}`;
    return negated ? `NOT (${expr})` : expr;
  }

  // Plain equality.
  const p = addParam(ctx, coerce(rawTerm, mapping.kind));
  const expr = `${mapping.sqlExpr} = ${placeholder(p, chType)}`;
  return negated ? `NOT (${expr})` : expr;
}

function compileRangedTerm(
  ctx: CompileCtx,
  node: lucene.NodeRangedTerm,
): string {
  const mapping = findField(ctx, node.field);
  if (!mapping) {
    if (ctx.options.strict) {
      throw new Error(`Unknown field: ${node.field}`);
    }
    ctx.unknownFields.add(node.field);
    return '';
  }
  ctx.referenced.add(node.field);
  const chType = clickHouseType(mapping.kind);
  const lo = unescapeLuceneTerm(node.term_min);
  const hi = unescapeLuceneTerm(node.term_max);
  const inclusiveLeft = node.inclusive === 'both' || node.inclusive === 'left';
  const inclusiveRight =
    node.inclusive === 'both' || node.inclusive === 'right';

  const parts: string[] = [];
  if (lo !== '*') {
    const p = addParam(ctx, coerce(lo, mapping.kind));
    parts.push(
      `${mapping.sqlExpr} ${inclusiveLeft ? '>=' : '>'} ${placeholder(p, chType)}`,
    );
  }
  if (hi !== '*') {
    const p = addParam(ctx, coerce(hi, mapping.kind));
    parts.push(
      `${mapping.sqlExpr} ${inclusiveRight ? '<=' : '<'} ${placeholder(p, chType)}`,
    );
  }
  if (parts.length === 0) {
    return '';
  }
  return parts.length === 1 ? parts[0] : `(${parts.join(' AND ')})`;
}

function isTerm(n: lucene.Node): n is lucene.NodeTerm {
  return 'term' in n && typeof n.term === 'string';
}

function isRangedTerm(n: lucene.Node): n is lucene.NodeRangedTerm {
  return 'inclusive' in n && 'term_min' in n;
}

function isBinaryAst(n: lucene.Node): n is lucene.BinaryAST {
  return 'right' in n && n.right != null;
}

function isLeftOnlyAst(n: lucene.Node): n is lucene.LeftOnlyAST {
  if (!('left' in n) || n.left == null) {
    return false;
  }
  const right = (n as { right?: unknown }).right;
  return right == null;
}

function normaliseOp(op: lucene.Operator | undefined): 'AND' | 'OR' {
  if (op === 'OR' || op === 'OR NOT') {
    return 'OR';
  }
  return 'AND';
}

function isNegating(op: lucene.Operator | undefined): boolean {
  return op === 'AND NOT' || op === 'OR NOT' || op === 'NOT';
}

function compileNode(ctx: CompileCtx, node: lucene.Node): string {
  if (isRangedTerm(node)) {
    return compileRangedTerm(ctx, node);
  }
  if (isTerm(node)) {
    return compileTerm(ctx, node);
  }
  if (isBinaryAst(node)) {
    const leftSql = compileNode(ctx, node.left);
    const rightRaw = compileNode(ctx, node.right);
    const rightSql = isNegating(node.operator)
      ? rightRaw
        ? `NOT (${rightRaw})`
        : ''
      : rightRaw;
    const op = normaliseOp(node.operator);
    if (!leftSql && !rightSql) {
      return '';
    }
    if (!leftSql) {
      return rightSql;
    }
    if (!rightSql) {
      return leftSql;
    }
    return `(${leftSql} ${op} ${rightSql})`;
  }
  if (isLeftOnlyAst(node)) {
    const sql = compileNode(ctx, node.left);
    if (!sql) {
      return '';
    }
    return node.start === 'NOT' ? `NOT (${sql})` : sql;
  }
  return '';
}

export function compileLuceneToSql(
  input: string,
  opts: CompileOptions,
): CompileResult {
  const trimmed = input.trim();
  const params: Record<string, string | number | boolean> = {};
  if (trimmed.length === 0) {
    return {
      sql: '',
      params,
      explanation: '(no filter)',
      referencedFields: [],
    };
  }
  const ctx: CompileCtx = {
    options: opts,
    paramPrefix: opts.paramPrefix ?? 'p',
    params,
    explanationParts: [],
    referenced: new Set<string>(),
    fieldMap: new Map(opts.fields.map((f) => [f.field, f])),
    unknownFields: new Set<string>(),
    paramCounter: { n: 0 },
  };

  let ast: lucene.AST;
  try {
    ast = lucene.parse(trimmed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'parse error';
    return {
      sql: '',
      params: {},
      explanation: `parse error: ${message}`,
      referencedFields: [],
    };
  }

  const sql = compileNode(ctx, ast as unknown as lucene.Node);

  if (ctx.unknownFields.size > 0) {
    ctx.explanationParts.push(
      `unknown field(s) skipped: ${[...ctx.unknownFields].join(', ')}`,
    );
  }
  const explanation =
    ctx.explanationParts.length === 0
      ? sql.length > 0
        ? sql
        : '(no filter)'
      : `${sql || '(no filter)'} — ${ctx.explanationParts.join('; ')}`;

  return {
    sql,
    params: ctx.params,
    explanation,
    referencedFields: [...ctx.referenced],
  };
}
