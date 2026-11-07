import { type ReactElement, type ReactNode, useId } from 'react';

import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useSectionSpy } from '../../hooks/useSectionSpy';
import { useStrings } from '../../locale';
import { Panel } from './Panel';
import './ScrollStory.css';

export interface ScrollStoryStep {
  /** Stable key for the step. */
  id: string;
  /** Rendered as an `h3`, so place the story under an `h2`. */
  title: ReactNode;
  body?: ReactNode;
  /**
   * Shown in the pinned panel while the step is current; on narrow
   * screens it sits under the step's text instead. Screen readers and the
   * keyboard reach only the current step's visual, so anything a reader
   * must not miss belongs in `title` or `body`.
   */
  visual: ReactNode;
}

export interface ScrollStoryProps {
  /** The steps in reading order. */
  steps: ScrollStoryStep[];
  /** Controls the current step; omit it to follow the scroll position. */
  currentIndex?: number;
  /** Called with the index that scrolling makes current. */
  onCurrentChange?: (index: number) => void;
  /** The element that scrolls the story; omitted or null means the viewport. */
  scrollContainer?: HTMLElement | null;
  /** Which side the pinned panel stands on. Defaults to `end`. */
  panelSide?: 'start' | 'end';
  className?: string;
}

/** A step becomes current once its top passes this share of the view. */
const ACTIVATION_PERCENT = 50;
const STACKED_QUERY = '(max-width: 768px)';

/**
 * A story told in steps: the steps scroll as ordinary text on the left
 * while a panel on the right stays pinned in the view and shows the
 * current step's visual. At 768px and narrower the panel is dropped and
 * each visual follows its own step.
 */
export function ScrollStory({
  steps,
  currentIndex,
  onCurrentChange,
  scrollContainer = null,
  panelSide = 'end',
  className,
}: ScrollStoryProps): ReactElement {
  const strings = useStrings();
  const titleIdPrefix = useId();
  const stacked = useMediaQuery(STACKED_QUERY);
  const stepIds = steps.map(
    (step) => `${titleIdPrefix}-step-${encodeURIComponent(step.id)}`,
  );
  const { activeId } = useSectionSpy({
    ids: stacked ? [] : stepIds,
    activationPercent: ACTIVATION_PERCENT,
    currentId: currentIndex === undefined ? undefined : stepIds[currentIndex],
    onCurrentChange:
      onCurrentChange &&
      ((id) => {
        onCurrentChange(stepIds.indexOf(id));
      }),
    scrollContainer,
  });
  const activeIndex = Math.max(
    activeId === undefined ? 0 : stepIds.indexOf(activeId),
    0,
  );

  const rootClass = [
    'aegis-scroll-story',
    stacked ? 'aegis-scroll-story--stacked' : '',
    panelSide === 'start' ? 'aegis-scroll-story--panel-start' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      <ol className="aegis-scroll-story__steps">
        {steps.map((step, index) => {
          const current = !stacked && index === activeIndex;
          return (
            <li
              key={step.id}
              id={stepIds[index]}
              className={[
                'aegis-scroll-story__step',
                current ? 'aegis-scroll-story__step--current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={current ? 'step' : undefined}
            >
              <span className="aegis-scroll-story__index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3
                id={`${titleIdPrefix}-${index}`}
                className="aegis-scroll-story__title"
              >
                {step.title}
              </h3>
              {step.body !== undefined && (
                <div className="aegis-scroll-story__body">{step.body}</div>
              )}
              {stacked && <Panel>{step.visual}</Panel>}
            </li>
          );
        })}
      </ol>
      {!stacked && steps.length > 0 && (
        <div className="aegis-scroll-story__aside">
          <Panel
            className="aegis-scroll-story__panel"
            title={strings.scrollStoryPosition(activeIndex + 1, steps.length)}
            extra={
              <span className="aegis-scroll-story__dots" aria-hidden="true">
                {steps.map((step, index) => (
                  <span
                    key={step.id}
                    className={[
                      'aegis-scroll-story__dot',
                      index === activeIndex
                        ? 'aegis-scroll-story__dot--current'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                ))}
              </span>
            }
          >
            <div className="aegis-scroll-story__visuals">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  role="group"
                  aria-labelledby={`${titleIdPrefix}-${index}`}
                  className={[
                    'aegis-scroll-story__visual',
                    index === activeIndex
                      ? 'aegis-scroll-story__visual--current'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {step.visual}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
