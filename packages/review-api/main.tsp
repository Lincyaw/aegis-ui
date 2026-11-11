import "@typespec/http";
import "@typespec/openapi";

using Http;

/**
 * Contract of the review workbench: a reviewer works through the items of a
 * task, judges each against telemetry evidence drawn as a graph, and saves a
 * verdict.
 *
 * Every GET maps to one JSON file, so a folder of files is a complete,
 * read-only implementation: `GET /api/review/<path>` is served by
 * `<root>/<path>.json` (for example `GET /api/review/contexts/c1/topology` by
 * `contexts/c1/topology.json`). A writable server adds the PUT.
 *
 * Evidence comes from raw telemetry only. A blind task never carries the
 * reference answer or where a candidate came from; those stay outside the
 * folder, with whoever scores the verdicts.
 *
 * Times are Unix seconds.
 */
@service(#{ title: "Aegis Review API" })
@route("/api/review")
namespace Aegis.Review;

/** An id that is safe as one path segment and one file name. */
@pattern("^[A-Za-z0-9._-]+$")
scalar SafeId extends string;

/** Unix time in seconds. */
scalar UnixSeconds extends int64;

// ── Shared shapes ────────────────────────────────────────────────────────

/** A labelled value shown beside an item or a context. */
model Fact {
  label: string;
  value: string;

  /** `mono` for ids and names, `time` for a Unix-seconds value in `value`. */
  kind?: "text" | "mono" | "time";
}

/** Summary of the calls or spans in one window. */
model WindowStats {
  calls: int32;

  /** Share of calls that failed, from 0 to 1. */
  errorRate: float64;

  p50Ms?: float64;
  p95Ms?: float64;
}

/** The same summary in the normal window and in the abnormal window. */
model StatsPair {
  normal: WindowStats;
  abnormal: WindowStats;
}

// ── Server ───────────────────────────────────────────────────────────────

model ServerInfo {
  name: string;
  version: string;

  /** False for a static folder: verdicts cannot be saved. */
  writable: boolean;
}

// ── Tasks, items, verdicts ───────────────────────────────────────────────

model GroupCount {
  group: string;
  count: int32;
}

model TaskSummary {
  id: SafeId;
  title: string;
  description?: string;
  itemCount: int32;

  /** Item counts per group (for example per system). */
  groups?: GroupCount[];
}

/** How a verdict option is coloured: `undecided` for "cannot tell". */
union Tone {
  "positive",
  "negative",
  "neutral",
  "undecided",
}

/** One answer a reviewer can give. */
model VerdictOption {
  value: string;
  label: string;

  /** When to choose this option, shown beside the button. */
  description: string;

  tone: Tone;

  /** One key that selects this option. */
  shortcut?: string;
}

model Task {
  ...TaskSummary;

  /** How to judge an item, in Markdown. */
  instructions?: string;

  verdictOptions: VerdictOption[];
}

/**
 * A relation the item asks about, in call direction: `source` calls
 * `target`. It may have no observed link.
 */
model ClaimedLink {
  source: SafeId;
  target: SafeId;
}

/** What the evidence graph opens on and highlights. */
model Focus {
  nodeIds: SafeId[];
  claimedLinks: ClaimedLink[];
}

model Item {
  id: SafeId;

  /** The id the item has outside this API, kept for scoring scripts. */
  externalId?: string;

  contextId: SafeId;
  group?: string;
  title: string;

  /** The statement the reviewer judges, in one sentence. */
  claim: string;

  facts: Fact[];
  focus: Focus;
}

model Verdict {
  itemId: SafeId;
  reviewer: SafeId;
  value: string;
  note: string;
  updatedAt: UnixSeconds;
}

model VerdictInput {
  value: string;
  note?: string;
}

// ── Evidence ─────────────────────────────────────────────────────────────

model TimeWindow {
  name: "normal" | "abnormal";
  start: UnixSeconds;
  end: UnixSeconds;
}

model TimeMarker {
  at: UnixSeconds;
  label: string;
  kind: "injection" | "other";
}

/** One case of telemetry that items are judged against. */
model Context {
  id: SafeId;
  title: string;
  group?: string;
  windows: TimeWindow[];
  markers: TimeMarker[];
  facts?: Fact[];
}

/** An endpoint of a node: a span name it serves or calls out from. */
model Port {
  id: SafeId;
  label: string;
  role: "server" | "client";
  stats?: StatsPair;
}

model GraphNode {
  id: SafeId;
  label: string;

  /** For example `service`, `database`, `cache`, `queue`, `gateway`, `loadgen`. */
  kind: string;

  /**
   * For example `fault-target` for a service named in the injection,
   * `fault-peer` for the other end of an injected network or HTTP fault, and
   * `no-traces` for a component seen only in metrics or logs (a broker, a
   * database, a cache), which serves no spans.
   */
  tags: string[];

  ports: Port[];

  /** Spans the node serves. */
  stats: StatsPair;

  /** Whether `GET contexts/{c}/nodes/{id}` exists. */
  hasDetail: boolean;
}

/** The calls between one pair of ports of a link. */
model PortLink {
  sourcePort: SafeId;
  targetPort: SafeId;
  stats: StatsPair;
}

/** Calls from `source` to `target`, observed in at least one window. */
model GraphLink {
  id: SafeId;
  source: SafeId;
  target: SafeId;
  kind: "call";
  stats: StatsPair;
  ports: PortLink[];

  /**
   * Which spans the link's calls are. `spans` (the default): the callee's
   * spans whose parent is a caller span. `caller-spans`: the callee emits no
   * spans; the calls are the caller's spans addressed to it, matched by span
   * kind and name: producer spans for a broker, and client spans that reached
   * no traced service for a database or a cache. `callee-spans`: the caller
   * emits no spans (a message broker); the calls are the callee's consumer
   * spans that start a consumption.
   */
  basis?: "spans" | "caller-spans" | "callee-spans";

  /**
   * The same calls as the caller measured them, for a link whose calls are
   * the callee's spans: the caller's client spans to the callee, whose
   * durations include the time on the network, plus the caller's client
   * spans that reached no callee span but name an endpoint only this callee
   * serves (calls that failed before the callee, for example to a killed pod
   * or across a network partition). Absent when the caller has no client
   * spans for the link.
   */
  callerStats?: StatsPair;

  /** Whether `GET contexts/{c}/links/{id}/series` exists. */
  hasSeries: boolean;
}

model Topology {
  context: Context;
  nodes: GraphNode[];
  links: GraphLink[];
}

model SeriesPoint {
  t: UnixSeconds;
  calls: int32;
  errorRate: float64;
  p50Ms?: float64;
  p95Ms?: float64;
}

model PortSeries {
  sourcePort: SafeId;
  targetPort: SafeId;
  points: SeriesPoint[];
}

/** A link's calls in fixed buckets across both windows. */
model LinkSeries {
  linkId: SafeId;
  bucketSeconds: int32;
  points: SeriesPoint[];
  ports: PortSeries[];

  /** The calls as the caller measured them (see `GraphLink.callerStats`). */
  callerPoints?: SeriesPoint[];
}

model MetricPoint {
  t: UnixSeconds;
  v: float64;
}

model MetricSeries {
  name: string;
  unit?: string;

  /** The pod or container the series belongs to. */
  instance?: string;

  points: MetricPoint[];
}

/** How often one log template appears in each window. */
model LogTemplateStat {
  template: string;
  level?: string;
  normal: int32;
  abnormal: int32;
  sample?: string;
}

model NodeDetail {
  nodeId: SafeId;
  metrics: MetricSeries[];
  logs: LogTemplateStat[];
}

// ── Operations ───────────────────────────────────────────────────────────

@error
model ErrorBody {
  @statusCode code: 400 | 404 | 405;
  message: string;
}

@route("/server")
@get
op getServer(): ServerInfo;

@route("/tasks")
interface Tasks {
  @get list(): TaskSummary[];

  @get @route("/{taskId}") get(@path taskId: SafeId): Task | ErrorBody;

  @get
  @route("/{taskId}/items")
  listItems(@path taskId: SafeId): Item[] | ErrorBody;

  @get
  @route("/{taskId}/verdicts/{reviewer}")
  listVerdicts(@path taskId: SafeId, @path reviewer: SafeId): Verdict[] | ErrorBody;

  @put
  @route("/{taskId}/verdicts/{reviewer}/{itemId}")
  putVerdict(
    @path taskId: SafeId,
    @path reviewer: SafeId,
    @path itemId: SafeId,
    @body body: VerdictInput,
  ): Verdict | ErrorBody;
}

@route("/contexts/{contextId}")
interface Contexts {
  @get
  @route("/topology")
  getTopology(@path contextId: SafeId): Topology | ErrorBody;

  @get
  @route("/nodes/{nodeId}")
  getNode(@path contextId: SafeId, @path nodeId: SafeId): NodeDetail | ErrorBody;

  @get
  @route("/links/{linkId}/series")
  getLinkSeries(@path contextId: SafeId, @path linkId: SafeId): LinkSeries | ErrorBody;
}
