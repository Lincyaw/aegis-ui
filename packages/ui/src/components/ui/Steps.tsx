import type { ReactNode } from 'react';

import { CheckOutlined } from '@ant-design/icons';

import './Steps.css';

export interface StepsItem {
  key: string;
  label: ReactNode;
  /** Keeps the step from being clicked, e.g. a later step whose earlier steps are incomplete. */
  disabled?: boolean;
}

interface StepsProps {
  items: StepsItem[];
  /** Index of the current step; the steps before it show as complete. */
  current: number;
  /** Makes every step but the current one a button that reports its index. */
  onStepClick?: (index: number) => void;
  /** Accessible name of the list, e.g. `Install steps`. */
  ariaLabel: string;
  className?: string;
}

type StepState = 'complete' | 'current' | 'upcoming';

/** The state the marker shows, put into words for assistive tech. */
const STATE_TEXT: Record<StepState, string | undefined> = {
  complete: 'completed',
  current: 'current step',
  upcoming: undefined,
};

function stepState(index: number, current: number): StepState {
  if (index < current) {
    return 'complete';
  }
  return index === current ? 'current' : 'upcoming';
}

export function Steps({
  items,
  current,
  onStepClick,
  ariaLabel,
  className,
}: StepsProps) {
  const cls = ['aegis-steps', className ?? ''].filter(Boolean).join(' ');
  return (
    <ol className={cls} aria-label={ariaLabel}>
      {items.map((item, index) => {
        const state = stepState(index, current);
        const spoken =
          item.disabled === true && state === 'upcoming'
            ? 'not yet available'
            : STATE_TEXT[state];
        const content = (
          <>
            <span className="aegis-steps__marker" aria-hidden="true">
              {state === 'complete' ? <CheckOutlined /> : index + 1}
            </span>
            <span className="aegis-steps__hidden">{`${String(index + 1)}. `}</span>
            <span className="aegis-steps__label">{item.label}</span>
            {spoken !== undefined && (
              <span className="aegis-steps__hidden">{` (${spoken})`}</span>
            )}
          </>
        );
        const clickable =
          onStepClick !== undefined &&
          state !== 'current' &&
          item.disabled !== true;
        return (
          <li
            key={item.key}
            className={`aegis-steps__item aegis-steps__item--${state}`}
          >
            {clickable ? (
              <button
                type="button"
                className="aegis-steps__step"
                onClick={() => {
                  onStepClick(index);
                }}
              >
                {content}
              </button>
            ) : (
              <span
                className="aegis-steps__step"
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
