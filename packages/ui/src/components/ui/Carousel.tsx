import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from 'react';

import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { usePageHidden } from '../../hooks/usePageHidden';
import { useStrings } from '../../locale';
import { Button } from './Button';
import './Carousel.css';
import { tablistKeyTarget } from './tablistKeyboard';

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
  /** Key of the slide shown; omit it to let the carousel track the slide. */
  activeKey?: string;
  /** Key of the slide shown first when `activeKey` is omitted; defaults to the first slide. */
  defaultActiveKey?: string;
  /** Fires with a slide's key when a tab is chosen and when autoplay moves to the next slide. */
  onChange?: (key: string) => void;
  className?: string;
}

/**
 * Slides with a named tab row under them. The current tab's progress bar
 * fills over `--carousel-dwell`, then the next slide shows. Autoplay pauses
 * on hover, on focus within and while the page is hidden, stops at the
 * pause button until it is pressed again, and is off under
 * prefers-reduced-motion, where neither the progress bars nor the button
 * are drawn.
 */
export function Carousel({
  slides,
  ariaLabel,
  activeKey: controlledKey,
  defaultActiveKey,
  onChange,
  className,
}: CarouselProps) {
  const [internalKey, setInternalKey] = useState(
    defaultActiveKey ?? slides[0]?.key,
  );
  const activeKey = controlledKey ?? internalKey;
  const activeIndex = Math.max(
    slides.findIndex((slide) => slide.key === activeKey),
    0,
  );
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const pageHidden = usePageHidden();
  const strings = useStrings();
  const [stopped, setStopped] = useState(false);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (index: number): void => {
    const { key } = slides[index];
    if (controlledKey === undefined) {
      setInternalKey(key);
    }
    onChange?.(key);
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    const target = tablistKeyTarget(event.key, index, slides.length);
    if (target === null) {
      return;
    }
    event.preventDefault();
    select(target);
    tabRefs.current[target]?.focus();
  };

  const cls = [
    'aegis-carousel',
    pageHidden || stopped ? 'aegis-carousel--paused' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={cls}
      aria-label={ariaLabel}
      aria-roledescription={strings.carouselRoleDescription}
    >
      <div
        className="aegis-carousel__viewport"
        aria-live={reducedMotion || stopped ? 'polite' : 'off'}
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
      <div className="aegis-carousel__controls">
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
                        onAnimationEnd={() =>
                          select((index + 1) % slides.length)
                        }
                      />
                    ) : null}
                  </span>
                )}
                <span className="aegis-carousel__label">{slide.label}</span>
              </button>
            );
          })}
        </div>
        {reducedMotion ? null : (
          <Button
            tone="ghost"
            className="aegis-carousel__toggle"
            aria-label={stopped ? strings.carouselPlay : strings.carouselPause}
            onClick={() => {
              setStopped(!stopped);
            }}
          >
            {stopped ? <CaretRightOutlined /> : <PauseOutlined />}
          </Button>
        )}
      </div>
    </section>
  );
}
