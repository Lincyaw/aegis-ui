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
import { Button, ButtonLink } from './Button';
import './Tour.css';
import type { LinkComponent } from './linkComponent';

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

/** What a Tour control does; `actionHref` gives each one's link. */
export type TourAction = 'prev' | 'next' | 'finish' | 'skip';

export interface TourProps {
  open: boolean;
  steps: readonly TourStep[];
  /** Index into `steps`. A step whose target is missing shows the next present one. */
  current: number;
  onChange: (current: number) => void;
  onClose: (reason: TourCloseReason) => void;
  labels?: Partial<TourLabels>;
  /**
   * Draws the panel inside the page's `<main>` (the target's nearest, else
   * the document's first) instead of a portal on `document.body`, as a
   * `role="region"` named by `label` rather than a dialog.
   */
  inline?: boolean;
  /** The inline panel's accessible name; defaults to the locale's `tour`. */
  label?: string;
  /**
   * Turns the controls into links to these hrefs, rendered by
   * `linkComponent`. A click still calls `onChange` or `onClose` as the
   * button would.
   */
  actionHref?: (action: TourAction) => string;
  /** Renders the action links; routed apps pass their Link adapter. */
  linkComponent?: LinkComponent;
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
  /** Set for an inline panel: a region with this name. */
  regionLabel: string | undefined;
  actionHref: ((action: TourAction) => string) | undefined;
  linkComponent: LinkComponent | undefined;
  onAction: (action: TourAction) => void;
}

const ACTION_CLASS: Readonly<Record<TourAction, string>> = {
  prev: 'aegis-tour__action--prev',
  next: 'aegis-tour__action--next',
  finish: 'aegis-tour__action--finish',
  skip: 'aegis-tour__action--skip',
};

const ACTIONS: readonly TourAction[] = ['prev', 'next', 'finish', 'skip'];

function TourPanel({
  title,
  description,
  position,
  total,
  labels,
  regionLabel,
  actionHref,
  linkComponent,
  onAction,
}: TourPanelProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const last = position === total - 1;
  const primary: TourAction = last ? 'finish' : 'next';

  useEffect(() => {
    panelRef.current
      ?.querySelector<HTMLElement>(`.${ACTION_CLASS[primary]}`)
      ?.focus({ preventScroll: true });
  }, [primary]);

  // A link adapter takes no click handler, so link clicks are heard here.
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  const linked = actionHref !== undefined;
  useEffect(() => {
    const actions = actionsRef.current;
    if (!linked || actions === null) {
      return undefined;
    }
    const onClick = (event: MouseEvent): void => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const hit = ACTIONS.find(
        (action) =>
          event.target instanceof Element &&
          event.target.closest(`.${ACTION_CLASS[action]}`) !== null,
      );
      if (hit !== undefined) {
        onActionRef.current(hit);
      }
    };
    actions.addEventListener('click', onClick);
    return () => {
      actions.removeEventListener('click', onClick);
    };
  }, [linked]);

  const control = (
    action: TourAction,
    tone: 'primary' | 'secondary' | 'ghost',
    text: string,
  ): ReactNode =>
    actionHref === undefined ? (
      <Button
        tone={tone}
        className={ACTION_CLASS[action]}
        onClick={() => {
          onAction(action);
        }}
      >
        {text}
      </Button>
    ) : (
      <ButtonLink
        to={actionHref(action)}
        tone={tone}
        className={ACTION_CLASS[action]}
        linkComponent={linkComponent}
      >
        {text}
      </ButtonLink>
    );

  const roleProps =
    regionLabel === undefined
      ? {
          role: 'dialog',
          'aria-labelledby': titleId,
          'aria-describedby':
            description === undefined ? undefined : descriptionId,
        }
      : { role: 'region', 'aria-label': regionLabel };

  return (
    <div ref={panelRef} {...roleProps} className="aegis-tour__panel">
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
        <div ref={actionsRef} className="aegis-tour__actions">
          {control('skip', 'ghost', labels.skip)}
          {position > 0 && control('prev', 'secondary', labels.previous)}
          {control(primary, 'primary', last ? labels.finish : labels.next)}
        </div>
      </div>
    </div>
  );
}

/**
 * The spotlight's margin around the target, cut to the room left of and
 * above it in the view: antd draws the mask's cover above and to the left
 * with what remains, which must not be negative.
 */
function edgeRoom(
  element: HTMLElement | null,
  offset: number,
): [number, number] {
  if (element === null) {
    return [offset, offset];
  }
  const { left, top } = element.getBoundingClientRect();
  const room = (edge: number): number =>
    Math.max(0, Math.min(offset, Math.floor(edge)));
  return [room(left), room(top)];
}

/**
 * The room measured at the shown step's last alignment. Before it, antd
 * still draws the spotlight where the previous step's target was for one
 * render, so the room there bounds the margin too.
 */
function spotlightOffset(
  room: { index: number; offset: [number, number] } | null,
  shownIndex: number | null,
  target: HTMLElement | null,
  offset: number,
): [number, number] {
  if (room !== null && room.index === shownIndex) {
    return room.offset;
  }
  const here = edgeRoom(target, offset);
  return room === null
    ? here
    : [Math.min(here[0], room.offset[0]), Math.min(here[1], room.offset[1])];
}

/** Scroll adjustments per step at most, whatever the layout does back. */
const MAX_SCROLL_PASSES = 3;

function scrollParent(element: HTMLElement): HTMLElement {
  for (
    let parent = element.parentElement;
    parent !== null;
    parent = parent.parentElement
  ) {
    const { overflowY } = getComputedStyle(parent);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.body;
}

/**
 * Scrolls so the panel lies wholly in the viewport, never pushing the
 * target's top out of it. Returns whether it scrolled.
 */
function keepInView(target: HTMLElement, panel: HTMLElement): boolean {
  const margin = cssNumber('--space-4');
  const targetRect = target.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const top = Math.min(targetRect.top, panelRect.top);
  const bottom = Math.max(targetRect.top, panelRect.bottom);
  let delta = 0;
  if (top < margin) {
    delta = top - margin;
  } else if (bottom > window.innerHeight - margin) {
    delta = Math.min(bottom - (window.innerHeight - margin), top - margin);
  }
  if (Math.abs(delta) < 1) {
    return false;
  }
  const scroller = scrollParent(target);
  const before = scroller.scrollTop;
  scroller.scrollBy({ top: delta, behavior: 'instant' });
  // At its end, or behind a sticky bar, the scroller does not move.
  if (Math.abs(scroller.scrollTop - before) < 1) {
    return false;
  }
  // antd measures the spotlight only on resize; the scroll moved the target.
  window.dispatchEvent(new Event('resize'));
  return true;
}

function mainOf(node: HTMLElement): HTMLElement {
  return (
    node.closest('main') ?? document.querySelector('main') ?? document.body
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
  inline = false,
  label,
  actionHref,
  linkComponent,
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

  // Adjusts the scroll after the step's first alignments, until nothing
  // needs to move; later alignments (the reader scrolling) are left alone.
  const settledRef = useRef<number | null>(null);
  const passesRef = useRef(0);
  const shownIndex = visible ? present[position] : null;
  useEffect(() => {
    settledRef.current = null;
    passesRef.current = 0;
  }, [shownIndex]);
  // Measured again at each alignment, since a scroll moves the target.
  const [room, setRoom] = useState<{
    index: number;
    offset: [number, number];
  } | null>(null);
  const onPopupAlign = (popup: HTMLElement): void => {
    if (shownIndex === null || geometry === null) {
      return;
    }
    const offset = edgeRoom(
      resolveTarget(steps[shownIndex].target),
      geometry.gap.offset,
    );
    setRoom((previous) =>
      previous?.index === shownIndex &&
      previous.offset[0] === offset[0] &&
      previous.offset[1] === offset[1]
        ? previous
        : { index: shownIndex, offset },
    );
    if (settledRef.current === shownIndex) {
      return;
    }
    passesRef.current += 1;
    const target = resolveTarget(steps[shownIndex].target);
    if (
      target === null ||
      !keepInView(target, popup) ||
      passesRef.current >= MAX_SCROLL_PASSES
    ) {
      settledRef.current = shownIndex;
    }
  };

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
          regionLabel={inline ? (label ?? strings.tour) : undefined}
          actionHref={actionHref}
          linkComponent={linkComponent}
          onAction={(action) => {
            switch (action) {
              case 'prev':
                onChange(present[at - 1]);
                break;
              case 'next':
                onChange(present[at + 1]);
                break;
              case 'finish':
              case 'skip':
                onClose(action);
                break;
            }
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
      gap={{
        offset: spotlightOffset(
          room,
          shownIndex,
          shownIndex === null ? null : resolveTarget(steps[shownIndex].target),
          geometry.gap.offset,
        ),
        radius: geometry.gap.radius,
      }}
      indicatorsRender={() => null}
      actionsRender={() => null}
      getPopupContainer={inline ? mainOf : undefined}
      // The mask is portalled after main; one layer lower, it stays under
      // a panel drawn inside main.
      mask={inline ? { style: { zIndex: geometry.zIndex - 1 } } : true}
      onPopupAlign={onPopupAlign}
    />
  );
}
