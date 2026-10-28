import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from 'react';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePageHidden } from '../../hooks/usePageHidden';
import './Carousel.css';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface CarouselSlide {
  key: string;
  /** Name shown in the tab row under the slides. */
  label: ReactNode;
  content: ReactNode;
}

export interface CarouselProps {
  slides: CarouselSlide[];
  /** Accessible name of the carousel region. */
  ariaLabel: string;
  activeIndex?: number;
  defaultActiveIndex?: number;
  /** Fires when a tab is chosen and when autoplay moves to the next slide. */
  onChange?: (index: number) => void;
  className?: string;
}

/**
 * Slides with a named tab row under them. The current tab's progress bar
 * fills over `--carousel-dwell`, then the next slide shows. Autoplay pauses
 * on hover, on focus within and while the page is hidden, and is off under
 * prefers-reduced-motion, where the progress bars are not drawn.
 */
export function Carousel({
  slides,
  ariaLabel,
  activeIndex: controlledIndex,
  defaultActiveIndex = 0,
  onChange,
  className,
}: CarouselProps) {
  const [internalIndex, setInternalIndex] = useState(defaultActiveIndex);
  const activeIndex = controlledIndex ?? internalIndex;
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const pageHidden = usePageHidden();
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (index: number): void => {
    if (controlledIndex === undefined) {
      setInternalIndex(index);
    }
    onChange?.(index);
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    const target = keyboardTargetIndex(event.key, index, slides.length);
    if (target === null) {
      return;
    }
    event.preventDefault();
    select(target);
    tabRefs.current[target]?.focus();
  };

  const cls = [
    'aegis-carousel',
    pageHidden ? 'aegis-carousel--paused' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={cls} aria-label={ariaLabel}>
      <div
        className="aegis-carousel__viewport"
        aria-live={reducedMotion ? 'polite' : 'off'}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.key}
            id={`${baseId}-slide-${index}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${index}`}
            className={
              index === activeIndex
                ? 'aegis-carousel__slide aegis-carousel__slide--active'
                : 'aegis-carousel__slide'
            }
          >
            <div className="aegis-carousel__content">{slide.content}</div>
          </div>
        ))}
      </div>
      <div className="aegis-carousel__tabs" role="tablist">
        {slides.map((slide, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={slide.key}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${index}`}
              aria-selected={active}
              aria-controls={`${baseId}-slide-${index}`}
              tabIndex={active ? 0 : -1}
              className={
                active
                  ? 'aegis-carousel__tab aegis-carousel__tab--active'
                  : 'aegis-carousel__tab'
              }
              onClick={() => select(index)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {reducedMotion ? null : (
                <span className="aegis-carousel__track" aria-hidden="true">
                  {active ? (
                    <span
                      className="aegis-carousel__fill"
                      onAnimationEnd={() => select((index + 1) % slides.length)}
                    />
                  ) : null}
                </span>
              )}
              <span className="aegis-carousel__label">{slide.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function keyboardTargetIndex(
  key: string,
  index: number,
  count: number,
): number | null {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
