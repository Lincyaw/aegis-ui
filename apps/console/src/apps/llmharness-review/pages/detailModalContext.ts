import { createContext, useContext } from 'react';

/**
 * A single click on a graph node, turn row or firing chip only moves the
 * cross-pane highlight; a double click opens the selection's detail in a
 * modal over the graph.
 */
export interface DetailModalApi {
  openDetail: () => void;
  openTurnsList: (turns: number[]) => void;
}

export const DetailModalContext = createContext<DetailModalApi>({
  openDetail: () => undefined,
  openTurnsList: () => undefined,
});

export function useDetailModal(): DetailModalApi {
  return useContext(DetailModalContext);
}
