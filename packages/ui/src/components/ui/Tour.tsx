import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Tour as AntdTour, type TourProps as AntdTourProps } from 'antd';

import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { useStrings } from '../../locale';
import { Button } from './Button';
import './Tour.css';

/** The element a step points at: a ref, a CSS selector, or a lookup. */
export type TourTarget =
  | RefObject<HTMLElement | null>
  | string
  | (() => HTMLElement | null);

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  target: TourTarget;
  title: ReactNode;
  description?: ReactNode;
  /** Side of the target the popover opens on; it flips when there is no room. */
  placement?: TourPlacement;
}

/** `finish` is the last step's done button; `skip` is the skip button or Escape. */
export type TourCloseReason = 'finish' | 'skip';

export interface TourLabels {
  previous: string;
  next: string;
  skip: string;
  finish: string;
  /** The position line, e.g. "2 / 3"; `position` counts from 1. */
  progress: (position: number, total: number) => string;
}

export interface TourProps {
  open: boolean;
  steps: readonly TourStep[];
  /** Index into `steps`. A step whose target is missing shows the next present one. */
  current: number;
  onChange: (current: number) => void;
  onClose: (reason: TourCloseReason) => void;
  labels?: Partial<TourLabels>;
}

function resolveTarget(target: TourTarget): HTMLElement | null {
  let element: HTMLElement | null;
  if (typeof target === 'string') {
    element = document.querySelector<HTMLElement>(target);
  } else if (typeof target === 'function') {
    element = target();
  } else {
    element = target.current;
  }
  // A target hidden by layout (display: none, a collapsed drawer) is missing too.
  if (!element?.isConnected || element.getClientRects().length === 0) {
    return null;
  }
  return element;
}

function presentSteps(steps: readonly TourStep[]): number[] {
  return steps.flatMap((step, index) =>
    resolveTarget(step.target) ? [index] : [],
  );
}

function sameIndices(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

function cssNumber(name: string): number {
  return Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(name),
  );
}

interface TourPanelProps {
  title: ReactNode;
  description: ReactNode;
  position: number;
  total: number;
  labels: TourLabels;
  onPrevious: () => void;
  onNext: () => void;
  onSkip: () => void;
}

function TourPanel({
  title,
  description,
  position,
  total,
  labels,
  onPrevious,
  onNext,
  onSkip,
}: TourPanelProps) {
  const titleId = useId();
  const descriptionId = useId();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const last = position === total - 1;

  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      className="aegis-tour__panel"
    >
      <h2 id={titleId} className="aegis-tour__title">
        {title}
      </h2>
      {description !== undefined && (
        <div id={descriptionId} className="aegis-tour__description">
          {description}
        </div>
      )}
      <div className="aegis-tour__footer">
        <span className="aegis-tour__progress">
          {labels.progress(position + 1, total)}
        </span>
        <div className="aegis-tour__actions">
          <Button tone="ghost" onClick={onSkip}>
            {labels.skip}
          </Button>
          {position > 0 && (
            <Button tone="secondary" onClick={onPrevious}>
              {labels.previous}
            </Button>
          )}
          <Button ref={primaryRef} tone="primary" onClick={onNext}>
            {last ? labels.finish : labels.next}
          </Button>
        </div>
      </div>
    </div>
  );
}

function defaultProgress(position: number, total: number): string {
  return `${String(position)} / ${String(total)}`;
}

/**
 * A guided tour: a spotlight on each step's target and a popover dialog
 * beside it. Steps whose target is missing or hidden are left out of the
 * tour and of its count. Escape skips. Wraps antd's Tour, so it follows the
 * `getAegisTheme` ConfigProvider; the panel itself is drawn from tokens.
 */
export function Tour({
  open,
  steps,
  current,
  onChange,
  onClose,
  labels,
}: TourProps) {
  const strings = useStrings();
  const mergedLabels: TourLabels = {
    previous: labels?.previous ?? strings.tourPrevious,
    next: labels?.next ?? strings.tourNext,
    skip: labels?.skip ?? strings.tourSkip,
    finish: labels?.finish ?? strings.tourFinish,
    progress: labels?.progress ?? defaultProgress,
  };
  const [present, setPresent] = useState<number[]>([]);

  // After commit, so refs are set; moving to another step looks again, so
  // a target that appeared since joins the tour.
  useIsomorphicLayoutEffect(() => {
    const next = open ? presentSteps(steps) : [];
    setPresent((previous) => (sameIndices(previous, next) ? previous : next));
  }, [open, steps, current]);

  const firstAtOrAfter = present.findIndex((index) => index >= current);
  const position = firstAtOrAfter === -1 ? present.length - 1 : firstAtOrAfter;
  const visible = open && present.length > 0;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current('skip');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [visible]);

  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => {
      const element = returnFocusRef.current;
      if (element?.isConnected) {
        element.focus({ preventScroll: true });
      }
    };
  }, [visible]);

  const geometry = useMemo(
    () =>
      visible
        ? {
            zIndex: cssNumber('--z-modal'),
            gap: {
              offset: cssNumber('--space-1'),
              radius: cssNumber('--radius-md'),
            },
          }
        : null,
    [visible],
  );

  if (!visible || geometry === null) {
    return null;
  }

  const antdSteps: AntdTourProps['steps'] = present.map((index, at) => {
    const step = steps[index];
    return {
      target: () => resolveTarget(step.target) ?? document.body,
      placement: step.placement,
      title: null,
      description: (
        <TourPanel
          key={index}
          title={step.title}
          description={step.description}
          position={at}
          total={present.length}
          labels={mergedLabels}
          onPrevious={() => {
            onChange(present[at - 1]);
          }}
          onNext={() => {
            if (at === present.length - 1) {
              onClose('finish');
            } else {
              onChange(present[at + 1]);
            }
          }}
          onSkip={() => {
            onClose('skip');
          }}
        />
      ),
    };
  });

  return (
    <AntdTour
      open
      steps={antdSteps}
      current={position}
      rootClassName="aegis-tour"
      closable={false}
      zIndex={geometry.zIndex}
      gap={geometry.gap}
      indicatorsRender={() => null}
      actionsRender={() => null}
    />
  );
}
