import type { CSSProperties, ReactNode } from 'react';

import './RollingValue.css';

interface RollingValueProps {
  value: ReactNode;
}

/**
 * Renders a number or numeric string whose digits roll to their new value
 * when it changes, right column first; the first render does not move.
 * Columns are keyed from the right so they stay put as the value grows.
 * The value itself sits in one visually hidden span, so screen readers,
 * copy and text queries read it whole; every visible face is generated
 * content inside an aria-hidden span. Any other node renders as is.
 */
export function RollingValue({ value }: RollingValueProps): ReactNode {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return value;
  }
  const text = String(value);
  if (!/\d/.test(text)) {
    return text;
  }
  const chars = [...text];
  return (
    <span className="aegis-rolling-value">
      <span className="aegis-rolling-value__text">{text}</span>
      <span aria-hidden="true">
        {chars.map((char, index) => {
          const column = chars.length - 1 - index;
          const digit = '0123456789'.indexOf(char);
          if (digit < 0) {
            return (
              <span
                key={column}
                className="aegis-rolling-value__char"
                data-char={char}
              />
            );
          }
          return (
            <span
              key={column}
              className="aegis-rolling-value__digit"
              data-char={char}
              style={
                {
                  '--aegis-roll-column': column,
                  '--aegis-roll-digit': digit,
                } as CSSProperties
              }
            />
          );
        })}
      </span>
    </span>
  );
}
