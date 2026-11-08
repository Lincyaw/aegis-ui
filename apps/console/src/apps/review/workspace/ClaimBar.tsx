import type { ReactElement, ReactNode } from 'react';

import {
  LeftOutlined,
  MenuUnfoldOutlined,
  ReadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Button, Chip, MonoValue } from '@lincyaw/aegis-ui';
import type { Context, Fact, Item } from '@lincyaw/review-api';

import { fmtDateTime } from '../evidence/format';
import { useReviewStrings } from '../locale/context';

export function FactValue({ fact }: { fact: Fact }): ReactNode {
  if (fact.kind === 'time') {
    const t = Number(fact.value);
    return Number.isFinite(t) ? fmtDateTime(t) : fact.value;
  }
  if (fact.kind === 'mono') {
    return <MonoValue size='sm'>{fact.value}</MonoValue>;
  }
  return fact.value;
}

interface ClaimBarProps {
  item: Item;
  context: Context | undefined;
  position: number;
  total: number;
  /** Items judged, shown while the item rail is folded away. */
  judged: number | undefined;
  onShowRail: () => void;
  onPrevious: (() => void) | undefined;
  onNext: (() => void) | undefined;
  onInstructions: (() => void) | undefined;
  onContext: () => void;
}

export function ClaimBar({
  item,
  context,
  position,
  total,
  judged,
  onShowRail,
  onPrevious,
  onNext,
  onInstructions,
  onContext,
}: ClaimBarProps): ReactElement {
  const s = useReviewStrings();
  return (
    <header className='review-claim'>
      <div className='review-claim__main'>
        <div className='review-claim__eyebrow'>
          {item.group !== undefined && <Chip tone='ink'>{item.group}</Chip>}
          <button
            type='button'
            className='review-claim__context'
            onClick={onContext}
            title={s.caseDetails}
          >
            {context?.title ?? item.contextId}
          </button>
          <span className='review-claim__title'>{item.title}</span>
        </div>
        <p className='review-claim__sentence'>{item.claim}</p>
        <dl className='review-claim__facts'>
          {item.facts.map((fact, index) => (
            <div
              key={`${fact.label}-${String(index)}`}
              className='review-claim__fact'
            >
              <dt>{fact.label}</dt>
              <dd>
                <FactValue fact={fact} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className='review-claim__nav'>
        <div className='review-claim__position'>
          <span className='review-claim__position-now'>{position}</span>
          <span className='review-claim__position-of'> / {total}</span>
        </div>
        {judged !== undefined && (
          <button
            type='button'
            className='review-claim__progress'
            onClick={onShowRail}
            title={s.showItemList}
          >
            <MenuUnfoldOutlined aria-hidden />
            <span>
              {judged}/{total} {s.judgedProgress}
            </span>
          </button>
        )}
        <div className='review-claim__nav-buttons'>
          <Button
            tone='secondary'
            icon={<LeftOutlined />}
            onClick={onPrevious}
            disabled={onPrevious === undefined}
            aria-label={s.previousItem}
            title={s.previousItem}
          >
            K
          </Button>
          <Button
            tone='secondary'
            icon={<RightOutlined />}
            iconPosition='end'
            onClick={onNext}
            disabled={onNext === undefined}
            aria-label={s.nextItem}
            title={s.nextItem}
          >
            J
          </Button>
        </div>
        {onInstructions !== undefined && (
          <Button
            tone='ghost'
            icon={<ReadOutlined />}
            onClick={onInstructions}
            title={s.guideHint}
          >
            {s.guide}
          </Button>
        )}
      </div>
    </header>
  );
}
