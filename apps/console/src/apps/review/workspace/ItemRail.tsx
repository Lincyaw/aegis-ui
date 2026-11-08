import { type ReactElement, useEffect, useMemo, useRef } from 'react';

import { MenuFoldOutlined } from '@ant-design/icons';
import { Button, MetricLabel, SearchInput, Tabs } from '@lincyaw/aegis-ui';
import type { Item, Verdict, VerdictOption } from '@lincyaw/review-api';

import { useReviewStrings } from '../locale/context';

import type { RailFilter } from './items';

interface ContextGroup {
  contextId: string;
  items: Item[];
}

interface RailGroup {
  group: string;
  contexts: ContextGroup[];
  total: number;
  done: number;
}

interface ItemRailProps {
  items: Item[];
  visible: Item[];
  verdicts: ReadonlyMap<string, Verdict>;
  options: VerdictOption[];
  currentId: string | undefined;
  filter: RailFilter;
  onFilter: (filter: RailFilter) => void;
  query: string;
  onQuery: (query: string) => void;
  onOpen: (item: Item) => void;
  onCollapse: () => void;
}

/** A long id with its middle cut out, since both ends tell cases apart. */
function shortId(id: string): string {
  return id.length > 24 ? `${id.slice(0, 10)}…${id.slice(-8)}` : id;
}

export function ItemRail({
  items,
  visible,
  verdicts,
  options,
  currentId,
  filter,
  onFilter,
  query,
  onQuery,
  onOpen,
  onCollapse,
}: ItemRailProps): ReactElement {
  const s = useReviewStrings();
  const listRef = useRef<HTMLDivElement>(null);
  const toneOf = useMemo(
    () => new Map(options.map((o) => [o.value, o.tone])),
    [options]
  );
  const labelOf = useMemo(
    () => new Map(options.map((o) => [o.value, o.label])),
    [options]
  );
  const groups = useMemo((): RailGroup[] => {
    const totals = new Map<string, { total: number; done: number }>();
    for (const item of items) {
      const g = item.group ?? '';
      const entry = totals.get(g) ?? { total: 0, done: 0 };
      entry.total += 1;
      entry.done += verdicts.has(item.id) ? 1 : 0;
      totals.set(g, entry);
    }
    const out = new Map<string, Map<string, Item[]>>();
    for (const item of visible) {
      const g = item.group ?? '';
      const contexts = out.get(g) ?? new Map<string, Item[]>();
      contexts.set(item.contextId, [
        ...(contexts.get(item.contextId) ?? []),
        item,
      ]);
      out.set(g, contexts);
    }
    return [...out.entries()].map(([group, contexts]) => ({
      group,
      contexts: [...contexts.entries()].map(([contextId, list]) => ({
        contextId,
        items: list,
      })),
      total: totals.get(group)?.total ?? 0,
      done: totals.get(group)?.done ?? 0,
    }));
  }, [items, visible, verdicts]);

  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(
      '[aria-current="true"]'
    );
    row?.scrollIntoView({ block: 'nearest' });
  }, [currentId]);

  const done = items.filter((i) => verdicts.has(i.id)).length;

  return (
    <div className='review-rail'>
      <div className='review-rail__head'>
        <div className='review-rail__progress'>
          <span className='review-rail__count'>
            {done}
            <span className='review-rail__count-of'> / {items.length}</span>
          </span>
          <MetricLabel>{s.judgedProgress}</MetricLabel>
          <Button
            tone='ghost'
            icon={<MenuFoldOutlined />}
            className='review-rail__fold'
            onClick={onCollapse}
            aria-label={s.hideItemList}
            title={s.hideItemList}
          >
            {null}
          </Button>
        </div>
        <div
          className='review-rail__meter'
          role='progressbar'
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={done}
          aria-label={s.itemsJudged}
        >
          <span
            className='review-rail__meter-fill'
            style={{
              width: `${String(items.length === 0 ? 0 : (done / items.length) * 100)}%`,
            }}
          />
        </div>
        <Tabs
          size='sm'
          listOnly
          ariaLabel={s.showItems}
          activeKey={filter}
          onChange={(key) => {
            onFilter(key === 'todo' ? 'todo' : key === 'done' ? 'done' : 'all');
          }}
          items={[
            { key: 'all', label: s.filterAll },
            { key: 'todo', label: s.filterTodo(items.length - done) },
            { key: 'done', label: s.filterDone },
          ]}
        />
        <SearchInput
          value={query}
          onChange={onQuery}
          placeholder={s.filterPlaceholder}
          block
        />
      </div>
      <div className='review-rail__list' ref={listRef}>
        {groups.length === 0 && (
          <div className='review-rail__empty'>{s.noMatch}</div>
        )}
        {groups.map((g) => (
          <section key={g.group} className='review-rail__group'>
            <div className='review-rail__group-head'>
              <span className='review-rail__group-name'>
                {g.group || s.itemsFallback}
              </span>
              <span className='review-rail__group-count'>
                {g.done} / {g.total}
              </span>
            </div>
            {g.contexts.map((c) => (
              <div key={c.contextId} className='review-rail__context'>
                <div className='review-rail__context-head' title={c.contextId}>
                  {shortId(c.contextId)}
                </div>
                {c.items.map((item) => {
                  const verdict = verdicts.get(item.id);
                  const active = item.id === currentId;
                  return (
                    <button
                      key={item.id}
                      type='button'
                      className={[
                        'review-rail__row',
                        active ? 'review-rail__row--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-current={active ? 'true' : undefined}
                      title={
                        verdict === undefined
                          ? item.title
                          : `${item.title} · ${labelOf.get(verdict.value) ?? verdict.value}`
                      }
                      onClick={() => {
                        onOpen(item);
                      }}
                    >
                      <span
                        className={[
                          'review-rail__dot',
                          verdict === undefined
                            ? 'review-rail__dot--open'
                            : `review-rail__dot--${toneOf.get(verdict.value) ?? 'neutral'}`,
                        ].join(' ')}
                        aria-hidden='true'
                      />
                      <span className='review-rail__title'>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
