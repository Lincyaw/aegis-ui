import { createContext, useContext } from 'react';

import type { ReviewConnection } from './connection';
import type { ReviewRepo } from './repo';

export interface ReviewContextValue {
  connection: ReviewConnection;
  setConnection: (next: ReviewConnection) => void;
  repo: ReviewRepo;
}

export const ReviewContext = createContext<ReviewContextValue | null>(null);

export function useReview(): ReviewContextValue {
  const value = useContext(ReviewContext);
  if (value === null) {
    throw new Error('useReview needs a ReviewProvider');
  }
  return value;
}

/** Tells repos apart in query keys: a new connection reads afresh. */
export function repoKey(repo: ReviewRepo): string {
  return `${repo.kind}:${repo.base}`;
}
