import type {
  Item,
  LinkSeries,
  NodeDetail,
  ServerInfo,
  Task,
  TaskSummary,
  Topology,
  Verdict,
} from '@lincyaw/review-api';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { repoKey, useReview } from './review';

const STATIC = { staleTime: Infinity, retry: false } as const;

export const reviewKeys = {
  server: (repo: string) => ['review', repo, 'server'] as const,
  tasks: (repo: string) => ['review', repo, 'tasks'] as const,
  task: (repo: string, taskId: string) =>
    ['review', repo, 'task', taskId] as const,
  items: (repo: string, taskId: string) =>
    ['review', repo, 'items', taskId] as const,
  verdicts: (repo: string, taskId: string, reviewer: string) =>
    ['review', repo, 'verdicts', taskId, reviewer] as const,
  topology: (repo: string, contextId: string) =>
    ['review', repo, 'topology', contextId] as const,
  node: (repo: string, contextId: string, nodeId: string) =>
    ['review', repo, 'node', contextId, nodeId] as const,
  series: (repo: string, contextId: string, linkId: string) =>
    ['review', repo, 'series', contextId, linkId] as const,
};

export function useServerInfo(): UseQueryResult<ServerInfo> {
  const { repo } = useReview();
  return useQuery({
    queryKey: reviewKeys.server(repoKey(repo)),
    queryFn: () => repo.getServer(),
    retry: false,
  });
}

export function useTasks(): UseQueryResult<TaskSummary[]> {
  const { repo } = useReview();
  return useQuery({
    queryKey: reviewKeys.tasks(repoKey(repo)),
    queryFn: () => repo.listTasks(),
    retry: false,
  });
}

export function useTask(taskId: string): UseQueryResult<Task> {
  const { repo } = useReview();
  return useQuery({
    queryKey: reviewKeys.task(repoKey(repo), taskId),
    queryFn: () => repo.getTask(taskId),
    ...STATIC,
  });
}

export function useItems(taskId: string): UseQueryResult<Item[]> {
  const { repo } = useReview();
  return useQuery({
    queryKey: reviewKeys.items(repoKey(repo), taskId),
    queryFn: () => repo.listItems(taskId),
    ...STATIC,
  });
}

export function useVerdicts(
  taskId: string,
  reviewer: string
): UseQueryResult<Verdict[]> {
  const { repo } = useReview();
  return useQuery({
    queryKey: reviewKeys.verdicts(repoKey(repo), taskId, reviewer),
    queryFn: () => repo.listVerdicts(taskId, reviewer),
    enabled: reviewer !== '',
    retry: false,
  });
}

export function useTopology(
  contextId: string | undefined
): UseQueryResult<Topology> {
  const { repo } = useReview();
  return useQuery({
    queryKey: reviewKeys.topology(repoKey(repo), contextId ?? ''),
    queryFn: () => repo.getTopology(contextId ?? ''),
    enabled: contextId !== undefined,
    ...STATIC,
  });
}

export function useNodeDetail(
  contextId: string,
  nodeId: string | undefined
): UseQueryResult<NodeDetail> {
  const { repo } = useReview();
  return useQuery({
    queryKey: reviewKeys.node(repoKey(repo), contextId, nodeId ?? ''),
    queryFn: () => repo.getNode(contextId, nodeId ?? ''),
    enabled: nodeId !== undefined,
    ...STATIC,
  });
}

export function useLinkSeries(
  contextId: string,
  linkId: string | undefined
): UseQueryResult<LinkSeries> {
  const { repo } = useReview();
  return useQuery({
    queryKey: reviewKeys.series(repoKey(repo), contextId, linkId ?? ''),
    queryFn: () => repo.getLinkSeries(contextId, linkId ?? ''),
    enabled: linkId !== undefined,
    ...STATIC,
  });
}
