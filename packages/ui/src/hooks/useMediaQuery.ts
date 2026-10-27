import { useEffect, useState } from 'react';

/** Tracks whether `query` (e.g. `(max-width: 768px)`) currently matches. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (): void => {
      setMatches(mql.matches);
    };
    onChange();
    mql.addEventListener('change', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, [query]);

  return matches;
}
