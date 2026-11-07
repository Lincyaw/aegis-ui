import type { ReactNode } from 'react';

import './CopyGlyph.css';

interface CopyGlyphProps {
  copied: boolean;
}

/** Two pages that merge and give way to a check drawing itself on copy. */
export function CopyGlyph({ copied }: CopyGlyphProps): ReactNode {
  return (
    <svg
      className={
        copied
          ? 'aegis-copy-glyph aegis-copy-glyph--copied'
          : 'aegis-copy-glyph'
      }
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <rect
        className="aegis-copy-glyph__page aegis-copy-glyph__page--back"
        x="2"
        y="2"
        width="8"
        height="8"
        rx="2"
      />
      <rect
        className="aegis-copy-glyph__page aegis-copy-glyph__page--front"
        x="6"
        y="6"
        width="8"
        height="8"
        rx="2"
      />
      <path
        className="aegis-copy-glyph__check"
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        pathLength="1"
      />
    </svg>
  );
}
