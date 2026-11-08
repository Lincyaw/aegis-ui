import type {
  Item,
  LinkSeries,
  NodeDetail,
  ServerInfo,
  Task,
  TaskSummary,
  Topology,
  Verdict,
  VerdictInput,
} from '@lincyaw/review-api';

/** Everything the Review sub-app reads and writes, whatever serves it. */
export interface ReviewRepo {
  readonly kind: 'server' | 'static';
  /** Where the data comes from, for the connection page. */
  readonly base: string;
  getServer(): Promise<ServerInfo>;
  listTasks(): Promise<TaskSummary[]>;
  getTask(taskId: string): Promise<Task>;
  listItems(taskId: string): Promise<Item[]>;
  listVerdicts(taskId: string, reviewer: string): Promise<Verdict[]>;
  putVerdict(
    taskId: string,
    reviewer: string,
    itemId: string,
    input: VerdictInput
  ): Promise<Verdict>;
  getTopology(contextId: string): Promise<Topology>;
  getNode(contextId: string, nodeId: string): Promise<NodeDetail>;
  getLinkSeries(contextId: string, linkId: string): Promise<LinkSeries>;
}

export class ReviewHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ReviewHttpError';
  }
}
