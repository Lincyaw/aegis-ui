import { type ReactElement, createContext } from 'react';

/**
 * What a `DetailBeside` asks of the tree, table or map it holds: the
 * element of the selected row, and, at 768 px and below, a place for the
 * detail right after that row.
 */
export interface SelectedRowDetail {
  /**
   * Called with the selected row's element once it is drawn where it
   * stays, again whenever it moves while its list keeps its size (a map's
   * pan or zoom), and with null when it goes.
   */
  placeRow: (row: HTMLElement | null) => void;
  /** At 768 px and below, the detail to draw right after the selected row; null above. */
  inline: ReactElement | null;
}

/** The `DetailBeside` around a list; null outside one and inside its detail. */
export const SelectedRowDetailContext = createContext<SelectedRowDetail | null>(
  null,
);
