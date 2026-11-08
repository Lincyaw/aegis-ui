import { type KeyboardEvent, type ReactElement, useRef, useState } from 'react';

import { useStrings } from '../../locale';
import './DecisionBar.css';

/** How an option is marked: `undecided` is for "cannot tell". */
export type DecisionTone = 'positive' | 'negative' | 'neutral' | 'undecided';

export interface DecisionOption {
  value: string;
  label: string;
  /** When to choose the option; shown under the bar while it is chosen or pointed at. */
  description?: string;
  tone?: DecisionTone;
  /** The key the host binds to the option, shown on its button. */
  shortcut?: string;
}

export interface DecisionBarProps {
  options: DecisionOption[];
  /** The chosen option, or `null` before one is chosen. */
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Names the group for assistive technology. */
  ariaLabel: string;
  /** False hides the description line. */
  descriptions?: boolean;
  className?: string;
}

/**
 * One answer among a few, each a button with its key, e.g. a reviewer's
 * verdict. The chosen answer is inverted. The host binds the keys; the bar
 * moves between answers with the arrow keys, as a radio group does.
 */
export function DecisionBar({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
  descriptions = true,
  className,
}: DecisionBarProps): ReactElement {
  const strings = useStrings();
  const [pointed, setPointed] = useState<string | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const chosen = options.findIndex((o) => o.value === value);
  const tabStop = chosen >= 0 ? chosen : 0;
  const shown =
    options.find((o) => o.value === pointed) ??
    options.find((o) => o.value === value);

  const handleKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    if (event.key in step) {
      event.preventDefault();
      const next = (index + step[event.key] + options.length) % options.length;
      refs.current[next]?.focus();
      onChange(options[next].value);
    }
  };

  return (
    <div
      className={['aegis-decision-bar', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="aegis-decision-bar__options"
        role="radiogroup"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
      >
        {options.map((option, index) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={index === tabStop ? 0 : -1}
              disabled={disabled}
              title={option.description}
              className={[
                'aegis-decision-bar__option',
                active ? 'aegis-decision-bar__option--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                onChange(option.value);
              }}
              onKeyDown={(event) => {
                handleKey(event, index);
              }}
              onPointerEnter={() => {
                setPointed(option.value);
              }}
              onPointerLeave={() => {
                setPointed(null);
              }}
            >
              <span
                className={`aegis-decision-bar__dot aegis-decision-bar__dot--${option.tone ?? 'neutral'}`}
                aria-hidden="true"
              />
              <span className="aegis-decision-bar__label">{option.label}</span>
              {option.shortcut !== undefined && option.shortcut !== '' && (
                <kbd
                  className="aegis-decision-bar__key"
                  aria-label={strings.decisionShortcut(
                    option.shortcut.toUpperCase(),
                  )}
                >
                  {option.shortcut.toUpperCase()}
                </kbd>
              )}
            </button>
          );
        })}
      </div>
      {descriptions && (
        <div className="aegis-decision-bar__description" aria-live="polite">
          {shown?.description ?? ''}
        </div>
      )}
    </div>
  );
}
