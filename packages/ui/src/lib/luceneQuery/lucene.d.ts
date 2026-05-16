// Minimal typing for @hyperdx/lucene (3.1.x). The upstream package ships no
// .d.ts; we model only the AST surface our compiler reads. Shape derived from
// lib/lucene.grammar in @hyperdx/lucene@3.1.1.
declare module '@hyperdx/lucene' {
  export type Operator =
    | 'AND'
    | 'OR'
    | 'NOT'
    | 'AND NOT'
    | 'OR NOT'
    | '<implicit>';

  export interface NodeTerm {
    field: string;
    term: string;
    quoted?: boolean;
    regex?: boolean;
    prefix?: string;
    boost?: number;
    similarity?: number;
    proximity?: number;
    fieldLocation?: unknown;
    termLocation?: unknown;
  }

  export interface NodeRangedTerm {
    field: string;
    term_min: string;
    term_max: string;
    inclusive: 'both' | 'left' | 'right' | 'none';
    inclusive_min?: boolean;
    inclusive_max?: boolean;
  }

  export type Node = NodeTerm | NodeRangedTerm | AST;

  export interface LeftOnlyAST {
    left: Node;
    start?: Operator;
    parenthesized?: boolean;
    field?: string;
  }

  export interface BinaryAST {
    left: Node;
    operator: Operator;
    right: Node;
    start?: Operator;
    parenthesized?: boolean;
    field?: string;
  }

  export type AST = LeftOnlyAST | BinaryAST | EmptyAST;

  export interface EmptyAST {
    left?: undefined;
    right?: undefined;
    operator?: Operator;
  }

  export function parse(query: string): AST;
  export function toString(ast: AST): string;
}
