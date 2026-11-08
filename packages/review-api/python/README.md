# review-api (Python)

Reference server and exporter for the review workbench contract (`../main.tsp`, compiled to `../generated/openapi.yaml`).
A review folder maps `GET /api/review/<path>` to `<root>/<path>.json`.

| File          | What it does                                                      | Needs                               |
| ------------- | ----------------------------------------------------------------- | ----------------------------------- |
| `serve.py`    | Serves a review folder and saves verdicts                         | standard library                    |
| `datapack.py` | Exports OpenRCA-style datapack cases into `contexts/<contextId>/` | duckdb, pyarrow, pyyaml, jsonschema |
| `contract.py` | Validates a whole review folder against the contract              | pyyaml, jsonschema                  |

## Export evidence

```bash
python3 datapack.py --out <root> <case_dir> [<case_dir> ...] --jobs 8
python3 datapack.py --out <root> --spec cases.json    # [{"dir", "contextId"?, "title"?, "extraNodes"?}]
python3 datapack.py --list-services <case_dir>        # service names in the traces, metrics and logs
```

Each case becomes `topology.json`, `nodes/<nodeId>.json` and `links/<linkId>/series.json`, validated before it replaces the old context folder.
One summary line of JSON per case goes to stdout.
A case of about 300k spans takes 1 to 3 seconds.

The exporter opens only the raw telemetry listed in `datapack.ALLOWED_FILES` (`env.json`, `injection.json`, and the normal and abnormal traces, metrics, metric sums and logs).
Causal graphs, labels, effects and conclusions stay unread, and the output carries raw statistics, never an anomaly verdict.

Definitions:

- Nodes are the services in the traces, then every other `service_name` in the metrics or logs (a broker, a database, a cache, or a service idle in both windows), tagged `no-traces`, then fault targets and requested services, which may appear nowhere. A `no-traces` node has zero span stats; its detail keeps its metric series and log templates even when they did not change, since they are all its evidence. Its kind comes from its name: `queue` for kafka or rabbitmq, `database` for mysql, postgres or mongodb, `cache` for redis, valkey or memcached.
- A call from service A to service B is a span of B whose parent span, in the same trace and window, belongs to A, with A ≠ B. Such a link has `basis: spans`.
- A call to a `no-traces` component C (`basis: caller-spans`) is a span of A addressed to C, matched by span kind and name: every Producer span goes to a broker; a Client or Internal span that reached no traced service goes to a database when its name is SQL (`SELECT ts.orders`, `sql.conn.query`) or mentions sql or mongo, to a cache when it is a Redis command (`HGET`) or starts with memcached, redis or valkey, and to a broker when it is an AMQP method (`basic.ack`); a span named exactly after a component (`postgresql`) goes to it. A span whose own child goes to the same component is left out, so a JPA span over its JDBC span counts once. The target must leave no doubt within the case: the one component of that kind named after A (`memcached-reserve-1` for `reservation`, `mongodb-profile` for `profile`), or else the only one of that kind. Otherwise the span stays in A's `(no callee span)` port. HTTP client spans never match.
- A delivery from a `no-traces` broker K to service B (`basis: callee-spans`) is a Consumer span of B whose parent is not a Consumer span of B, when K is the one broker the case leaves no doubt about. Producer and consumer spans joined by trace context keep their direct `spans` link as well.
- A span failed when `attr.status_code = 'Error'` or `attr.http.response.status_code >= 500`.
- Link latencies are quantiles of the callee span's duration, or of the caller span's for `caller-spans`. Node stats cover the node's entry spans (no parent in the same service).
- A port is a span name with path ids masked as `{id}`. It is a client port when its spans are of kind Client or Producer, a server port when they are entries or of kind Server or Consumer, and otherwise a client port when they call out. Server port stats cover every span of that name in the node. A `no-traces` node has a server port per caller span name that reached it and a client port per consumer service and span name it delivered to.
- A client port is split by the endpoint its spans reached: one port per (callee service, callee span name), with the caller's own span stats, so its latency includes the network. A bare method name such as `POST` takes the callee's span name as its label (`POST /api/v1/seatservice/seats/left_tickets`). Spans that reached no other service form one more port, labelled `POST (no callee span)` when the same name also reached a callee. That port holds the calls that failed before the callee, the evidence when a callee pod is gone.
- Link series use 30-second buckets from the normal start to the abnormal end. Every bucket is present.

## Serve

```bash
python3 serve.py --root <root> [--host 127.0.0.1] [--port 8768] [--read-only] [--ui <built SPA dir>]
```

`PUT /api/review/tasks/{taskId}/verdicts/{reviewer}/{itemId}` with `{"value", "note"?}` checks the ids and the value against the task, then upserts into `tasks/<taskId>/verdicts/<reviewer>.json` (temporary file and rename).
`GET .../verdicts/{reviewer}` answers `[]` while that reviewer has saved nothing.
CORS is open, so a Vite dev server on another origin can call it.

## Validate

```bash
python3 contract.py <root>
```

Checks every file against its schema and the references across files: links to nodes, port links to ports, `hasDetail` and `hasSeries` to the files, items to contexts and focus nodes, verdicts to items and options.
