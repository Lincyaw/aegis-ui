import { type ReactNode, useId } from 'react';

import './ChoiceCardGroup.css';

export interface ChoiceCardOption {
  value: string;
  title: string;
  /** Muted line under the title; keep it to inline content. */
  description?: ReactNode;
  /** Short note beside the title, e.g. a scope or a count. */
  meta?: string;
  disabled?: boolean;
}

interface ChoiceCardGroupProps {
  options: ChoiceCardOption[];
  /** Value of the chosen card; `''` when none is chosen. */
  value: string;
  onChange: (value: string) => void;
  /** Accessible name of the group. */
  ariaLabel: string;
  className?: string;
}

/**
 * A single choice drawn as a grid of cards. Each card is a native radio
 * button, so arrow keys move the choice and the group reads as one control.
 */
export function ChoiceCardGroup({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: ChoiceCardGroupProps) {
  const name = useId();
  const cls = ['aegis-choice-card-group', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cls}>
      {options.map((option) => {
        const selected = option.value === value;
        const cardCls = [
          'aegis-choice-card',
          selected ? 'aegis-choice-card--selected' : '',
          option.disabled ? 'aegis-choice-card--disabled' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <label key={option.value} className={cardCls}>
            <input
              type="radio"
              className="aegis-choice-card__input"
              name={name}
              value={option.value}
              checked={selected}
              disabled={option.disabled}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <span className="aegis-choice-card__head">
              <span className="aegis-choice-card__title">{option.title}</span>
              {option.meta !== undefined && (
                <span className="aegis-choice-card__meta">{option.meta}</span>
              )}
            </span>
            {option.description !== undefined && (
              <span className="aegis-choice-card__description">
                {option.description}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
