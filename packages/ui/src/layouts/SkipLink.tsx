import type { ReactElement, RefObject } from 'react';

import { useStrings } from '../locale';
import './SkipLink.css';

interface SkipLinkProps {
  /** The id of the page's `main`, for the link's href. */
  targetId: string;
  targetRef: RefObject<HTMLElement | null>;
}

/**
 * The first keyboard stop of a frame: it waits above the viewport until
 * focused, then moves focus past the header to the page. It moves focus
 * without a URL fragment, so a shared page link stays as it was.
 */
export function SkipLink({ targetId, targetRef }: SkipLinkProps): ReactElement {
  const strings = useStrings();
  return (
    <a
      className="aegis-skip-link"
      href={`#${targetId}`}
      onClick={(event) => {
        event.preventDefault();
        targetRef.current?.focus();
      }}
    >
      {strings.skipToContent}
    </a>
  );
}
