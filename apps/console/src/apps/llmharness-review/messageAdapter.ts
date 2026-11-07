import {
  type AgentBlock,
  type AgentRole,
  normalizeContent,
  normalizeRole,
} from '../shared/agentContent';

import type { MainTurn } from './schemas';

export interface NormalizedTurn {
  index: number;
  role: AgentRole;
  blocks: AgentBlock[];
  raw: MainTurn;
}

/** A main-agent turn in the shape the chat renderer consumes. */
export function normalizeTurn(turn: MainTurn): NormalizedTurn {
  return {
    index: turn.index,
    role: normalizeRole(turn.role),
    blocks: normalizeContent(turn.content),
    raw: turn,
  };
}
