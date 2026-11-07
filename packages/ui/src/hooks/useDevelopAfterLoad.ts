import { useState } from 'react';

/**
 * True from the render where `loading` turns false after having been true:
 * the moment loaded content takes its skeleton's place. Put the result on
 * the content's container as `data-aegis-develop` and the content develops
 * in (theme.css). Content that is there on the first render does not
 * develop; the page entrance already brings it in.
 */
export function useDevelopAfterLoad(loading: boolean): boolean {
  const [sawLoading, setSawLoading] = useState(loading);
  if (loading && !sawLoading) {
    setSawLoading(true);
  }
  return sawLoading && !loading;
}
