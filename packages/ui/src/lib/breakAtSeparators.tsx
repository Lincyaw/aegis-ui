import type { ReactNode } from 'react';

/**
 * A text label with a line-break opportunity after each `_ . - / :`, so an
 * id such as `no_destructive_ddl` wraps between its words, never inside one.
 */
export function breakAtSeparators(label: ReactNode): ReactNode {
  if (typeof label !== 'string') {
    return label;
  }
  return label
    .split(/(?<=[_./:-])/)
    .flatMap((part, index) =>
      index === 0 ? [part] : [<wbr key={index} />, part],
    );
}
