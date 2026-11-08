import { type ReactElement, useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  ButtonLink,
  EmptyState,
  ErrorState,
  type LinkComponent,
  MetricLabel,
  PageHeader,
  Panel,
  ScoreBar,
  SkeletonText,
  StatBlock,
} from '@lincyaw/aegis-ui';
import type { TaskSummary } from '@lincyaw/review-api';

import { describeUrl } from '../connection';
import { useReviewStrings } from '../locale/context';
import { useItems, useTasks, useVerdicts } from '../queries';
import { useReview } from '../review';

import './TaskListPage.css';

const RouterLink: LinkComponent = ({ to, className, children, ...rest }) => (
  <Link to={to} className={className} {...rest}>
    {children}
  </Link>
);

function TaskCard({ task }: { task: TaskSummary }): ReactElement {
  const s = useReviewStrings();
  const { connection } = useReview();
  const items = useItems(task.id);
  const verdicts = useVerdicts(task.id, connection.reviewer);
  const judged = useMemo(
    () => new Set((verdicts.data ?? []).map((v) => v.itemId)),
    [verdicts.data]
  );
  const groups = useMemo(() => {
    const counts = new Map<string, { total: number; done: number }>();
    for (const item of items.data ?? []) {
      const key = item.group ?? s.itemsFallback;
      const entry = counts.get(key) ?? { total: 0, done: 0 };
      entry.total += 1;
      entry.done += judged.has(item.id) ? 1 : 0;
      counts.set(key, entry);
    }
    if (counts.size === 0) {
      for (const g of task.groups ?? []) {
        counts.set(g.group, { total: g.count, done: 0 });
      }
    }
    return [...counts.entries()];
  }, [items.data, judged, task.groups, s]);
  const doneTotal = groups.reduce((sum, [, g]) => sum + g.done, 0);

  return (
    <Panel
      title={task.title}
      to={task.id}
      linkComponent={RouterLink}
      description={task.description}
    >
      <div className='review-tasks__card'>
        <div className='review-tasks__stats'>
          <StatBlock label={s.statItems} value={task.itemCount} />
          <StatBlock
            label={
              connection.reviewer === ''
                ? s.statJudged
                : s.statJudgedBy(connection.reviewer)
            }
            value={connection.reviewer === '' ? '–' : doneTotal}
          />
        </div>
        <ul className='review-tasks__groups'>
          {groups.map(([group, g]) => (
            <li key={group} className='review-tasks__group'>
              <MetricLabel>{group}</MetricLabel>
              {connection.reviewer === '' ? (
                <span className='review-tasks__count'>
                  {s.itemsCount(g.total)}
                </span>
              ) : (
                <ScoreBar
                  value={g.done}
                  max={g.total}
                  format={(v) => `${String(v)} / ${String(g.total)}`}
                  ariaLabel={s.groupJudged(group, g.done, g.total)}
                />
              )}
            </li>
          ))}
        </ul>
        {connection.reviewer === '' && (
          <p className='review-tasks__hint'>{s.setReviewerHint}</p>
        )}
      </div>
    </Panel>
  );
}

export function TaskListPage(): ReactElement {
  const s = useReviewStrings();
  const { connection } = useReview();
  const tasks = useTasks();
  return (
    <div className='review-tasks'>
      <PageHeader
        title={s.reviewTasks}
        description={s.source(describeUrl(connection.url, s))}
        action={
          <ButtonLink
            to='connection'
            linkComponent={RouterLink}
            tone='secondary'
          >
            {s.connection}
          </ButtonLink>
        }
      />
      {tasks.isPending && <SkeletonText lines={4} />}
      {tasks.isError && (
        <ErrorState
          title={s.tasksFailed}
          description={s.tasksFailedHint(
            describeUrl(connection.url, s),
            tasks.error.message
          )}
          action={
            <ButtonLink to='connection' linkComponent={RouterLink}>
              {s.open} {s.connection}
            </ButtonLink>
          }
        />
      )}
      {tasks.data?.length === 0 && (
        <EmptyState title={s.noTasks} description={s.noTasksHint} />
      )}
      {tasks.data !== undefined && tasks.data.length > 0 && (
        <div className='review-tasks__list'>
          {tasks.data.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
