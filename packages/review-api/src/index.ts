/**
 * Types of the review workbench API, generated from `main.tsp`
 * (`pnpm -F @lincyaw/review-api build`). Edit the TypeSpec, never the
 * generated file.
 */
import type { components, paths } from './openapi.gen';

type S = components['schemas'];

export type ReviewPaths = paths;

export type ServerInfo = S['ServerInfo'];
export type TaskSummary = S['TaskSummary'];
export type Task = S['Task'];
export type GroupCount = S['GroupCount'];
export type VerdictOption = S['VerdictOption'];
export type Tone = S['Tone'];
export type Item = S['Item'];
export type Focus = S['Focus'];
export type ClaimedLink = S['ClaimedLink'];
export type Fact = S['Fact'];
export type Verdict = S['Verdict'];
export type VerdictInput = S['VerdictInput'];
export type WindowStats = S['WindowStats'];
export type StatsPair = S['StatsPair'];
export type TimeWindow = S['TimeWindow'];
export type TimeMarker = S['TimeMarker'];
export type Context = S['Context'];
export type Port = S['Port'];
export type GraphNode = S['GraphNode'];
export type GraphLink = S['GraphLink'];
export type PortLink = S['PortLink'];
export type Topology = S['Topology'];
export type SeriesPoint = S['SeriesPoint'];
export type PortSeries = S['PortSeries'];
export type LinkSeries = S['LinkSeries'];
export type MetricPoint = S['MetricPoint'];
export type MetricSeries = S['MetricSeries'];
export type LogTemplateStat = S['LogTemplateStat'];
export type NodeDetail = S['NodeDetail'];

/** Prefix every route of the API shares. */
export const REVIEW_API_PREFIX = '/api/review';

/**
 * The file that serves `GET <prefix>/<path>` in a static folder:
 * `<path>.json`. For example `contexts/c1/topology` → `contexts/c1/topology.json`.
 */
export function staticFileFor(path: string): string {
  return `${path.replace(/^\/+|\/+$/g, '')}.json`;
}
