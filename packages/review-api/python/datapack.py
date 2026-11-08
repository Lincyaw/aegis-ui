#!/usr/bin/env python3
"""Export the telemetry of OpenRCA-style datapack cases as review-workbench evidence.

For one case directory this writes, under `<root>/contexts/<contextId>/`:

    topology.json                 Topology: services, the calls between them, ports, window stats
    nodes/<nodeId>.json           NodeDetail: metrics of the node's pods and its log templates
    links/<linkId>/series.json    LinkSeries: the link's calls in fixed buckets across both windows

Blindness: the evidence comes from raw telemetry only. The exporter opens nothing but the files in
`ALLOWED_FILES` (enforced by `CaseFiles`); causal graphs, labels, effects, conclusions and anything
else an annotation pipeline produced stay unread. The output holds raw statistics and never an
anomaly verdict: the UI decides how to colour a change.

Definitions:
  - a call from service A to service B is a span of B whose parent span, in the same trace and the
    same window, belongs to A, with A != B;
  - a span failed when `attr.status_code = 'Error'` or `attr.http.response.status_code >= 500`;
  - latencies are quantiles of the callee span's `duration`.

    python3 datapack.py --out <root> <case_dir> [<case_dir> ...] [--jobs 8]
    python3 datapack.py --out <root> --spec cases.json   # [{"dir", "contextId"?, "title"?, "extraNodes"?}]
    python3 datapack.py --list-services <case_dir>       # {"traces": [...], "metrics": [...], "logs": [...]}

Prints one JSON summary per case to stdout; progress goes to stderr.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import math
import os
import re
import shutil
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import duckdb
import pyarrow as pa

from contract import check, check_topology

# ── Blindness ────────────────────────────────────────────────────────────

ALLOWED_FILES = frozenset({
    'env.json',
    'injection.json',
    'normal_traces.parquet', 'abnormal_traces.parquet',
    'normal_metrics.parquet', 'abnormal_metrics.parquet',
    # Raw counters from the same collector; read only for the pod network metrics.
    'normal_metrics_sum.parquet', 'abnormal_metrics_sum.parquet',
    'normal_logs.parquet', 'abnormal_logs.parquet',
})


class BlindnessError(RuntimeError):
    """The exporter tried to open a file that is not raw telemetry."""


class CaseFiles:
    """Read access to one case directory, limited to ALLOWED_FILES."""

    def __init__(self, case_dir: str | Path):
        self.dir = Path(case_dir).resolve()
        if not self.dir.is_dir():
            raise FileNotFoundError(f'{self.dir} is not a directory')

    def path(self, name: str) -> str | None:
        if name not in ALLOWED_FILES:
            raise BlindnessError(f'{name} is not raw telemetry; the exporter may not open it')
        p = self.dir / name
        return str(p) if p.is_file() else None

    def json(self, name: str) -> dict:
        p = self.path(name)
        if p is None:
            raise FileNotFoundError(f'{self.dir / name} is missing')
        return json.loads(Path(p).read_text())


# ── Small helpers ────────────────────────────────────────────────────────

_UNSAFE = re.compile(r'[^A-Za-z0-9._-]+')


def safe_id(text: str, maxlen: int = 96) -> str:
    """A SafeId (`^[A-Za-z0-9._-]+$`, never `.` or `..`) derived from `text`."""
    s = _UNSAFE.sub('_', text).strip('_').lstrip('.')[:maxlen].rstrip('.')
    return s or 'x'


def _unique(base: str, taken: set[str]) -> str:
    out, n = base, 2
    while out in taken:
        out, n = f'{base}.{n}', n + 1
    taken.add(out)
    return out


def _r(v: float | None, digits: int = 3) -> float | None:
    return None if v is None or not math.isfinite(v) else round(float(v), digits)


def _sig(v: float) -> float:
    return float(f'{v:.6g}')


SYSTEM_NAMES = {'ts': 'TrainTicket', 'otel-demo': 'OTel Demo', 'hs': 'Hotel Reservation',
                'sn': 'Social Network', 'mm': 'Media Microservices'}

# chaos-experiment handler.ChaosType, for injection.json files that store the type as a number.
CHAOS_TYPES = [
    'PodKill', 'PodFailure', 'ContainerKill', 'MemoryStress', 'CPUStress',
    'HTTPRequestAbort', 'HTTPResponseAbort', 'HTTPRequestDelay', 'HTTPResponseDelay',
    'HTTPResponseReplaceBody', 'HTTPResponsePatchBody', 'HTTPRequestReplacePath',
    'HTTPRequestReplaceMethod', 'HTTPResponseReplaceCode', 'DNSError', 'DNSRandom', 'TimeSkew',
    'NetworkDelay', 'NetworkLoss', 'NetworkDuplicate', 'NetworkCorrupt', 'NetworkBandwidth',
    'NetworkPartition', 'JVMLatency', 'JVMReturn', 'JVMException', 'JVMGarbageCollector',
    'JVMCPUStress', 'JVMMemoryStress', 'JVMMySQLLatency', 'JVMMySQLException', 'JVMRuntimeMutator',
]


def node_kind(service: str) -> str:
    n = service.lower()
    if any(k in n for k in ('kafka', 'rabbitmq', 'nats', 'pulsar', 'activemq', 'rocketmq')):
        return 'queue'
    if any(k in n for k in ('mysql', 'postgres', 'mongo', 'mariadb')):
        return 'database'
    if any(k in n for k in ('redis', 'memcached', 'valkey')):
        return 'cache'
    if 'loadgenerator' in n or 'load-generator' in n:
        return 'loadgen'
    if any(k in n for k in ('frontend-proxy', 'ui-dashboard', 'gateway', 'frontend')):
        return 'gateway'
    return 'service'


# Spans that reached no traced service: which kind of untraced component they went to.
_SQL_SPAN = re.compile(r'^(select|insert|update|delete|replace|merge|upsert|create|drop|alter|truncate|begin|commit|rollback)(\s|$)'
                       r'|sql|mongo', re.I)
_CACHE_SPAN = re.compile(r'^(memcache|redis|valkey)', re.I)
_AMQP_SPAN = re.compile(r'^(basic|queue|exchange|channel)\.[a-z]', re.I)
REDIS_COMMANDS = frozenset(
    'GET SET MGET MSET SETEX SETNX GETSET DEL EXISTS EXPIRE PEXPIRE TTL PTTL INCR INCRBY DECR DECRBY APPEND '
    'HGET HSET HMGET HMSET HGETALL HDEL HEXISTS HINCRBY HKEYS HVALS HLEN LPUSH RPUSH LPOP RPOP LRANGE LLEN '
    'LREM SADD SREM SMEMBERS SISMEMBER SCARD ZADD ZREM ZRANGE ZRANGEBYSCORE ZSCORE ZCARD SCAN KEYS PING '
    'EVAL EVALSHA MULTI EXEC WATCH PUBLISH'.split())
_NAME_STOP = {'mongodb', 'mongo', 'memcached', 'redis', 'valkey', 'mysql', 'postgres', 'postgresql', 'kafka',
              'rabbitmq', 'cache', 'store'}


def store_kind(label: str, kind: str, http: bool) -> str | None:
    """The kind of component a span that reached no traced service called, from its span kind and name."""
    if kind == 'Producer' or _AMQP_SPAN.match(label):
        return 'queue'
    if http:
        return None
    if kind == 'Client' and label.split(' ', 1)[0] in REDIS_COMMANDS:
        return 'cache'
    if _CACHE_SPAN.match(label):
        return 'cache'
    if _SQL_SPAN.search(label):
        return 'database'
    return None


def _named_after(service: str, component: str) -> bool:
    """Whether a component is named after a service, e.g. `mongodb-rate` after `rate`, `memcached-reserve-1`
    after `reservation`, `valkey-cart` after `cart`."""
    core = re.sub(r'^ts-|-service$', '', service.lower())

    def close(t: str) -> bool:
        if t == core:
            return True
        if min(len(t), len(core)) >= 4 and (core.startswith(t) or t.startswith(core)):
            return True
        return len(os.path.commonprefix([core, t])) >= 6

    return any(close(t) for t in re.split(r'[-_.]', component.lower())
               if t and t not in _NAME_STOP and not t.isdigit())


def untraced_callee(service: str, want: str, untraced: dict[str, str]) -> str | None:
    """The untraced component of kind `want` that `service` calls, if the case leaves no doubt: the one
    named after the service, or else the only one of that kind."""
    cands = sorted(c for c, k in untraced.items() if k == want and c != service)
    named = [c for c in cands if _named_after(service, c)]
    if len(named) == 1:
        return named[0]
    if not named and len(cands) == 1:
        return cands[0]
    return None


def span_target(service: str, label: str, kind: str, http: bool, untraced: dict[str, str]) -> str | None:
    """The untraced component a span of `service` that reached no traced service went to, or None."""
    if not http:
        low = label.lower()
        direct = [c for c in untraced if c != service and c.lower() in (low, low.split(' ', 1)[0])]
        if len(direct) == 1:
            return direct[0]
    want = store_kind(label, kind, http)
    return untraced_callee(service, want, untraced) if want else None


_BARE_METHOD = re.compile(r'^(HTTP )?(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$')
_ID_SEGMENT = re.compile(r'\d')
_VERSION = re.compile(r'^v\d+$')
_HOST = re.compile(r'^(.*?://[^/]*)(/.*)?$')


def port_label(span_name: str) -> str:
    """A span name with ids in its URL path replaced by `{id}`, so one route is one port.

    `GET /api/v1/foods/2025-08-05/shanghai/D1345?x=1` becomes `GET /api/v1/foods/{id}/shanghai/{id}`;
    the host of a full URL, version segments like `v1` and templates like `{tripId}` are kept.
    """
    name = (span_name or '').split('?', 1)[0].strip()
    m = _HOST.match(name)
    if m:
        head, path = m.group(1), m.group(2) or ''
    else:
        i = name.find('/')
        head, path = (name, '') if i < 0 else (name[:i], name[i:])
    segs = path.split('/')
    for i, seg in enumerate(segs):
        if seg and not seg.startswith('{') and not _VERSION.match(seg) and _ID_SEGMENT.search(seg):
            segs[i] = '{id}'
    return (head + '/'.join(segs)) or '(unnamed)'


# Log messages without a template: mask what varies so one statement is one template.
_HTTP_STATUS = re.compile(r'(HTTP/[\d.]+") (\d{3})')
_MASKS = [
    (re.compile(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?Z?'), '<ts>'),
    (re.compile(r'eyJ[\w-]+(?:\.[\w-]+)*'), '<token>'),
    (re.compile(r'[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{2,12}){1,4}'), '<id>'),
    (re.compile(r'\b[0-9A-Fa-f]{12,}\b'), '<hex>'),
    (re.compile(r'(?<=[=:] )[^\s,;\]\)\}"\[<]+|(?<==)[^\s,;\]\)\}"&\[<]+'), '<*>'),
    (re.compile(r'\b(?=[A-Za-z_]*\d)[A-Za-z0-9_]{5,}\b'), '<*>'),
    (re.compile(r'(?<![\w<§])\d+(?:\.\d+)?'), '<n>'),
    (re.compile(r'(<[a-z*]+>)(?:[,\s]+<[a-z*]+>)+'), r'\1…'),
]


def _structured(message: str) -> str | None:
    """`msg [METHOD route -> status]` for a JSON log line such as an access log, else None."""
    if not message.startswith('{'):
        return None
    try:
        d = json.loads(message)
    except ValueError:
        return None
    if not isinstance(d, dict):
        return None
    text = str(d.get('msg') or d.get('message') or d.get('event') or '')
    req = d.get('request') if isinstance(d.get('request'), dict) else {}
    method, uri = req.get('method') or d.get('method'), req.get('uri') or d.get('uri') or d.get('path')
    if method or uri:
        text += f' [{method or ""} {port_label("/" + str(uri).lstrip("/")) if uri else ""}'.rstrip()
        status = d.get('status') or d.get('status_code')
        text += f' -> {status}]' if status is not None else ']'
    return text.strip() or None


def log_template(message: str) -> str:
    structured = _structured(message.strip())
    if structured is not None:
        return structured[:300]
    s = _HTTP_STATUS.sub(r'\1 §\2', message.strip())
    for pat, rep in _MASKS:
        s = pat.sub(rep, s)
    return s.replace('§', '')[:300]


_LEVELS = {'INFORMATION': 'INFO', 'WARNING': 'WARN', 'SEVERE': 'ERROR', 'CRITICAL': 'FATAL', 'ERR': 'ERROR'}

# ── Case metadata ────────────────────────────────────────────────────────


@dataclass
class Fault:
    type: str
    target: str | None
    peer: str | None = None
    params: dict = field(default_factory=dict)

    def summary(self) -> str:
        s = f'{self.type} on {self.target or "?"}'
        return s + (f' → {self.peer}' if self.peer else '')


def parse_faults(inj: dict) -> list[Fault]:
    """The injected faults, from either injection.json format (never from its ground_truth)."""
    faults = []
    ec = inj.get('engine_config')
    if isinstance(ec, list):  # batch format: one entry per fault
        for e in ec:
            params = {k: v for k, v in e.items() if k not in
                      ('app', 'chaos_type', 'target_service', 'namespace', 'system', 'system_type')}
            faults.append(Fault(str(e.get('chaos_type')), e.get('app'), e.get('target_service'), params))
    elif 'display_config' in inj:  # single-fault format
        dc = json.loads(inj['display_config']) if isinstance(inj['display_config'], str) else inj['display_config']
        ip = dc.get('injection_point') or {}
        ft = inj.get('fault_type')
        ftype = CHAOS_TYPES[ft] if isinstance(ft, int) and 0 <= ft < len(CHAOS_TYPES) else str(ft)
        target = ip.get('app_name') or ip.get('app_label') or ip.get('source_service')
        peer = ip.get('target_service') or ip.get('server_address')
        params = {k: v for k, v in dc.items() if k not in ('injection_point', 'namespace')}
        params.update({k: v for k, v in ip.items() if k not in
                       ('app_name', 'app_label', 'source_service', 'target_service', 'server_address')})
        faults.append(Fault(ftype, target, peer, params))
    return faults


def _iso_to_unix(s: str | None) -> int | None:
    if not s:
        return None
    from datetime import datetime
    try:
        return int(datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp())
    except ValueError:
        return None


@dataclass
class Windows:
    normal: tuple[int, int]
    abnormal: tuple[int, int]

    @property
    def start(self) -> int:
        return min(self.normal[0], self.abnormal[0])

    @property
    def end(self) -> int:
        return max(self.normal[1], self.abnormal[1])


def read_windows(env: dict) -> Windows:
    g = lambda k: int(float(env[k]))  # noqa: E731
    return Windows((g('NORMAL_START'), g('NORMAL_END')), (g('ABNORMAL_START'), g('ABNORMAL_END')))


def system_of(inj: dict, env: dict) -> str:
    code = inj.get('category') or inj.get('pedestal_name')
    if not code and isinstance(inj.get('display_config'), str):
        code = json.loads(inj['display_config']).get('namespace')
    if not code:
        code = re.sub(r'\d+$', '', env.get('NAMESPACE', '')) or 'unknown'
    return SYSTEM_NAMES.get(code, code)


# ── Export ───────────────────────────────────────────────────────────────

PORT_CAP = 12            # ports per role per node, besides the ones a kept port link needs
PORT_LINK_CAP = 8        # port pairs per link
METRIC_CAP = 16          # metric series per node
PREFERRED_CAP = 12       # of which at most this many come from the preference list
MAX_POINTS = 120         # points per metric series
MIN_CHANGE = 0.05        # relative change between window means a metric outside the preference list needs
LOG_CAP = 20             # templates by |abnormal - normal|, plus up to this many new ones

NET_IO, NET_ERR = 'k8s.pod.network.io (rate)', 'k8s.pod.network.errors (rate)'
PREFERRED_METRICS = [
    'k8s.container.restarts', 'k8s.container.ready', 'container.cpu.usage', 'k8s.pod.cpu_limit_utilization',
    'container.memory.working_set', 'k8s.pod.memory_limit_utilization', NET_IO, NET_ERR,
    'jvm.cpu.recent_utilization', 'jvm.system.cpu.utilization', 'jvm.memory.used', 'jvm.gc.duration',
]
# Configuration constants, and pod-level copies of the container metrics above.
EXCLUDED_METRICS = [
    'k8s.container.cpu_limit', 'k8s.container.cpu_request', 'k8s.container.memory_limit',
    'k8s.container.memory_request', 'container.filesystem.capacity', 'k8s.pod.filesystem.capacity',
    'k8s.pod.cpu.usage', 'k8s.pod.memory.usage', 'k8s.pod.memory.working_set', 'k8s.pod.memory.rss',
    'k8s.pod.memory.page_faults', 'k8s.pod.memory.major_page_faults', 'k8s.pod.memory.available',
    'k8s.pod.filesystem.available', 'k8s.pod.filesystem.usage', 'k8s.namespace.phase',
    'k8s.replicaset.available', 'k8s.replicaset.desired',
]

STATS = ('count(*)::BIGINT AS n, avg(err)::DOUBLE AS e, '
         'quantile_cont(dur, 0.5) / 1e6 AS p50, quantile_cont(dur, 0.95) / 1e6 AS p95')


def _window_stats(row) -> dict:
    if not row or not row[0]:
        return {'calls': 0, 'errorRate': 0.0}
    n, e, p50, p95 = row
    out = {'calls': int(n), 'errorRate': _r(e, 4) or 0.0}
    if _r(p50) is not None:
        out['p50Ms'] = _r(p50)
    if _r(p95) is not None:
        out['p95Ms'] = _r(p95)
    return out


def _pair(by_window: dict) -> dict:
    return {'normal': _window_stats(by_window.get('normal')), 'abnormal': _window_stats(by_window.get('abnormal'))}


def _volume(by_window: dict) -> int:
    return sum(int(r[0]) for r in by_window.values() if r)


def _metric_unit(metric: str) -> str | None:
    if metric == NET_IO:
        return 'By/s'
    if metric == NET_ERR:
        return '1/s'
    if metric.endswith('_seconds'):
        return 's'
    if 'utilization' in metric:
        return '1'
    if metric in ('container.cpu.usage', 'k8s.pod.cpu.usage'):
        return 'cores'
    if ('memory' in metric or 'filesystem' in metric) and 'page_faults' not in metric:
        return 'By'
    return None


class _Exporter:
    def __init__(self, files: CaseFiles, threads: int):
        self.f = files
        self.con = duckdb.connect(config={'threads': threads})

    def _source(self, kind: str) -> tuple[str, set[str]] | None:
        """`read_parquet` over both windows of `kind`, with a `w` column, and the column names."""
        paths = {w: self.f.path(f'{w}_{kind}.parquet') for w in ('normal', 'abnormal')}
        paths = {w: p for w, p in paths.items() if p}
        if not paths:
            return None
        lst = ', '.join(f"'{p}'" for p in paths.values())
        raw = f'read_parquet([{lst}], union_by_name = true, filename = true)'
        cols = {r[0] for r in self.con.execute(f'DESCRIBE SELECT * FROM {raw}').fetchall()}
        normal = paths.get('normal', '')
        src = f"(SELECT CASE WHEN filename = '{normal}' THEN 'normal' ELSE 'abnormal' END AS w, * FROM {raw})"
        return src, cols

    @staticmethod
    def _col(cols: set[str], name: str, default: str = 'NULL') -> str:
        return f'"{name}"' if name in cols else default

    def _rows(self, sql: str):
        return self.con.execute(sql).fetchall()

    # traces

    def load_traces(self, win: Windows, bucket: int) -> None:
        src = self._source('traces')
        if src is None:
            raise FileNotFoundError(f'{self.f.dir}: no traces')
        src, cols = src
        c = lambda n, d='NULL': self._col(cols, n, d)  # noqa: E731
        self.con.execute(f"""
            CREATE TEMP TABLE spans_raw AS
            SELECT w, trace_id, span_id, parent_span_id, coalesce(span_name, '') AS raw_name,
                   service_name AS svc, {c('attr.span_kind')} AS kind, {c('attr.k8s.pod.name')} AS pod,
                   {c('attr.http.request.method')} AS http,
                   epoch(time) AS ts, duration::DOUBLE AS dur,
                   CASE WHEN {c('attr.status_code')} = 'Error'
                          OR coalesce({c('attr.http.response.status_code')}, 0) >= 500 THEN 1 ELSE 0 END AS err
            FROM {src} WHERE coalesce(service_name, '') <> ''""")
        names = [r[0] for r in self._rows('SELECT DISTINCT raw_name FROM spans_raw')]
        self.con.register('name_map', pa.table({'raw_name': names, 'label': [port_label(n) for n in names]}))
        self.con.execute("""
            CREATE TEMP TABLE spans AS SELECT s.*, m.label FROM spans_raw s JOIN name_map m USING (raw_name);
            DROP TABLE spans_raw;
            CREATE TEMP TABLE calls AS
            SELECT ch.w, par.svc AS caller, ch.svc AS callee, par.label AS cport, ch.label AS sport,
                   ch.ts, ch.dur, ch.err
            FROM spans ch JOIN spans par
              ON ch.trace_id = par.trace_id AND ch.parent_span_id = par.span_id AND ch.w = par.w
            WHERE ch.svc <> par.svc;
            CREATE TEMP TABLE outcalls AS
            SELECT DISTINCT par.w, par.trace_id, par.span_id, ch.svc AS callee, ch.label AS clabel
            FROM spans ch JOIN spans par
              ON ch.trace_id = par.trace_id AND ch.parent_span_id = par.span_id AND ch.w = par.w
            WHERE ch.svc <> par.svc;
            CREATE TEMP TABLE entry AS
            SELECT s.* FROM spans s WHERE NOT EXISTS (
              SELECT 1 FROM spans p WHERE p.trace_id = s.trace_id AND p.span_id = s.parent_span_id
                                     AND p.w = s.w AND p.svc = s.svc);
            CREATE TEMP TABLE vcalls (w VARCHAR, caller VARCHAR, callee VARCHAR, cport VARCHAR, sport VARCHAR,
                                      ts DOUBLE, dur DOUBLE, err INTEGER, basis VARCHAR);
            CREATE TEMP VIEW allcalls AS
            SELECT w, caller, callee, cport, sport, ts, dur, err FROM calls
            UNION ALL SELECT w, caller, callee, cport, sport, ts, dur, err FROM vcalls;""")
        self.t0, self.t1, self.bucket = win.start, win.end, bucket

    def services(self) -> list[str]:
        return [r[0] for r in self._rows('SELECT DISTINCT svc FROM spans ORDER BY 1')]

    def pods_from_traces(self) -> dict[str, str]:
        return dict(self._rows("SELECT pod, any_value(svc) FROM spans WHERE coalesce(pod, '') <> '' GROUP BY 1"))

    def grouped(self, table: str, keys: str, where: str = '') -> dict[tuple, dict]:
        """{key tuple: {window: (n, e, p50, p95)}} for spans or calls grouped by `keys`."""
        out: dict[tuple, dict] = {}
        for row in self._rows(f'SELECT {keys}, w, {STATS} FROM {table} {where} GROUP BY ALL'):
            k = len(row) - 5
            out.setdefault(tuple(row[:k]), {})[row[k]] = row[k + 1:]
        return out

    def telemetry_services(self) -> set[str]:
        """Service names in the metrics and logs."""
        out = set()
        for kind in ('metrics', 'logs'):
            src = self._source(kind)
            if src is not None:
                out |= {r[0] for r in self._rows(
                    f"SELECT DISTINCT service_name FROM {src[0]} WHERE coalesce(service_name, '') <> ''")}
        return out

    def add_untraced_calls(self, untraced: dict[str, str]) -> None:
        """Calls to and from components that emit no spans (`untraced`, name to kind), as rows of `vcalls`.

        caller-spans: a caller span addressed to exactly one untraced component (`span_target`): any
        Producer span, which goes to a broker whether or not a consumer span follows it, and any Client or
        Internal span that reached no traced service. A span whose own child goes to the same component
        is left out, so a JPA span over its JDBC span counts once. The span is also recorded in
        `outcalls`, so the caller's client port for that component holds it.
        callee-spans: a Consumer span that starts a consumption (its parent is not a Consumer span of the
        same service), delivered by the one broker the case leaves no doubt about. Producer and consumer
        spans that trace context joins keep their direct link as well.
        """
        if not untraced:
            return
        self.con.execute("""
            CREATE TEMP TABLE loose AS
            SELECT s.* FROM spans s WHERE s.kind = 'Producer' OR (s.kind IN ('Client', 'Internal') AND NOT EXISTS (
              SELECT 1 FROM outcalls o WHERE o.w = s.w AND o.trace_id = s.trace_id AND o.span_id = s.span_id))""")
        match = []
        for svc, label, kind, http in self._rows('SELECT DISTINCT svc, label, kind, http IS NOT NULL FROM loose'):
            target = span_target(svc, label, kind, http, untraced)
            if target:
                match.append((svc, label, kind, http, target))
        if match:
            cols = list(zip(*match))
            self.con.register('vtarget', pa.table({'svc': cols[0], 'label': cols[1], 'kind': cols[2],
                                                   'http': cols[3], 'target': cols[4]}))
            self.con.execute("""
                CREATE TEMP TABLE vmatched AS
                WITH m AS (SELECT s.w, s.trace_id, s.span_id, s.parent_span_id, s.svc, s.label, s.ts, s.dur, s.err,
                                  v.target FROM loose s
                           JOIN vtarget v ON v.svc = s.svc AND v.label = s.label AND v.kind = s.kind
                                         AND v.http = (s.http IS NOT NULL))
                SELECT * EXCLUDE (parent_span_id) FROM m WHERE NOT EXISTS (
                  SELECT 1 FROM m k WHERE k.w = m.w AND k.trace_id = m.trace_id AND k.parent_span_id = m.span_id
                                      AND k.target = m.target);
                INSERT INTO vcalls SELECT w, svc, target, label, label, ts, dur, err, 'caller-spans' FROM vmatched;
                INSERT INTO outcalls SELECT DISTINCT w, trace_id, span_id, target, label FROM vmatched;""")
        consumers = [r[0] for r in self._rows("SELECT DISTINCT svc FROM spans WHERE kind = 'Consumer' ORDER BY 1")]
        brokers = {c: b for c in consumers if (b := untraced_callee(c, 'queue', untraced))}
        if brokers:
            self.con.register('cbroker', pa.table({'svc': list(brokers), 'broker': list(brokers.values())}))
            self.con.execute("""
                INSERT INTO vcalls
                SELECT c.w, b.broker, c.svc, c.label, c.label, c.ts, c.dur, c.err, 'callee-spans'
                FROM spans c JOIN cbroker b ON b.svc = c.svc
                WHERE c.kind = 'Consumer' AND NOT EXISTS (
                  SELECT 1 FROM spans p WHERE p.trace_id = c.trace_id AND p.span_id = c.parent_span_id
                                         AND p.w = c.w AND p.svc = c.svc AND p.kind = 'Consumer')""")

    def link_basis(self) -> dict[tuple[str, str], str]:
        """{(caller, callee): basis} for the links made of `vcalls`; every other link is `spans`."""
        rows = self._rows('SELECT DISTINCT caller, callee, basis FROM vcalls')
        clash = set(self._rows('SELECT DISTINCT caller, callee FROM calls')) & {(a, b) for a, b, _ in rows}
        if clash:
            raise ValueError(f'links with spans on both ends and from one end only: {sorted(clash)}')
        return {(a, b): basis for a, b, basis in rows}

    def port_roles(self) -> dict[tuple[str, str], str]:
        """{(service, label): role} for every span name a service serves or calls out from.

        A span name is a client port when the service's spans of that name are of kind Client or Producer,
        a server port when they are entries (no parent in the same service) or of kind Server or Consumer,
        and otherwise a client port when they call another service or an untraced component. A gateway
        whose Server spans call the backends directly therefore has server ports only, and a load
        generator client ports only.
        """
        rows = self._rows("""
            WITH k AS (SELECT svc, label, kind FROM (SELECT svc, label, kind, count(*) AS n FROM spans GROUP BY ALL)
                       QUALIFY row_number() OVER (PARTITION BY svc, label ORDER BY n DESC, kind NULLS LAST) = 1),
                 e AS (SELECT DISTINCT svc, label FROM entry),
                 c AS (SELECT DISTINCT caller AS svc, cport AS label FROM calls
                       UNION SELECT DISTINCT caller, cport FROM vcalls WHERE basis = 'caller-spans')
            SELECT k.svc, k.label, k.kind, e.svc IS NOT NULL, c.svc IS NOT NULL FROM k
            LEFT JOIN e USING (svc, label) LEFT JOIN c USING (svc, label)""")
        roles = {}
        for svc, label, kind, is_entry, calls_out in rows:
            if kind in ('Client', 'Producer'):
                roles[(svc, label)] = 'client'
            elif is_entry or kind in ('Server', 'Consumer'):
                roles[(svc, label)] = 'server'
            elif calls_out:
                roles[(svc, label)] = 'client'
        return roles

    def client_split(self) -> dict[tuple, dict]:
        """{(svc, label, callee, callee label): {window: stats}} over a service's own spans, split by the
        endpoint of another service they called; callee and callee label are None for spans that reached
        no other service (failed before the callee, or calls to an uninstrumented database or cache)."""
        out: dict[tuple, dict] = {}
        for row in self._rows(f"""
                SELECT s.svc, s.label, o.callee, o.clabel, s.w, {STATS} FROM spans s
                LEFT JOIN outcalls o ON o.w = s.w AND o.trace_id = s.trace_id AND o.span_id = s.span_id
                GROUP BY ALL"""):
            out.setdefault(tuple(row[:4]), {})[row[4]] = row[5:]
        return out

    def series(self, keys: str) -> dict[tuple, dict[int, tuple]]:
        """{key tuple: {bucket index: (n, e, p50, p95)}} for calls grouped by `keys`."""
        out: dict[tuple, dict] = {}
        sql = (f'SELECT {keys}, floor((ts - {self.t0}) / {self.bucket})::BIGINT AS k, {STATS} FROM allcalls '
               f'WHERE ts >= {self.t0} AND ts < {self.t1} GROUP BY ALL')
        for row in self._rows(sql):
            k = len(row) - 5
            out.setdefault(tuple(row[:k]), {})[int(row[k])] = row[k + 1:]
        return out

    # metrics

    def metrics(self, owners: set[str], trace_pods: dict[str, str], win: Windows,
                steady: set[str] = frozenset()) -> dict[str, list[dict]]:
        """Chosen metric series per owner; owners in `steady` keep series that did not change."""
        src = self._source('metrics')
        if src is None or not owners:
            return {}
        src, cols = src
        c = lambda n: self._col(cols, n)  # noqa: E731
        excluded = ', '.join(f"'{m}'" for m in EXCLUDED_METRICS)
        self.con.execute(f"""
            CREATE TEMP TABLE mraw AS
            SELECT w, epoch(time) AS ts, metric, value, coalesce(service_name, '') AS svc,
                   coalesce({c('attr.k8s.pod.name')}, '') AS pod, coalesce({c('attr.k8s.container.name')}, '') AS ctr,
                   coalesce({c('attr.k8s.deployment.name')}, '') AS dep,
                   coalesce({c('attr.destination_workload')}, '') AS dst
            FROM {src}
            WHERE value IS NOT NULL AND isfinite(value) AND metric NOT IN ({excluded})""")
        # Rows such as k8s.container.restarts carry the pod but no service: map pods to services.
        pod_map = dict(trace_pods)
        best: dict[str, tuple[int, str]] = {}
        for pod, svc, n in self._rows("""SELECT pod, svc, count(*) FROM mraw
                                         WHERE pod <> '' AND svc <> '' AND metric NOT LIKE 'hubble%' GROUP BY ALL"""):
            if (-n, svc) < (-best.get(pod, (0, ''))[0], best.get(pod, (0, ''))[1] or '\uffff'):
                best[pod] = (n, svc)
        pod_map.update({p: s for p, (_, s) in best.items()})
        pods = sorted(pod_map)
        self.con.register('pod_map', pa.table({'pod': pods, 'owner': [pod_map[p] for p in pods]}))
        self.con.register('owners', pa.table({'owner': sorted(owners)}))
        self.con.execute("""
            CREATE TEMP TABLE multi AS SELECT pod FROM mraw WHERE pod <> '' AND ctr <> ''
                GROUP BY pod HAVING count(DISTINCT ctr) > 1;
            CREATE TEMP TABLE m AS
            SELECT r.w, r.ts, r.metric, o.owner,
                   CASE WHEN r.metric LIKE 'hubble%' THEN '→ ' || coalesce(nullif(r.dst, ''), '(any)')
                        WHEN r.pod <> '' THEN r.pod || CASE WHEN r.pod IN (SELECT pod FROM multi) AND r.ctr <> ''
                                                            THEN '/' || r.ctr ELSE '' END
                        WHEN r.dep <> '' THEN r.dep ELSE o.owner END AS instance,
                   r.value
            FROM (SELECT mraw.*, CASE WHEN mraw.svc <> '' THEN mraw.svc ELSE pm.owner END AS own
                  FROM mraw LEFT JOIN pod_map pm ON pm.pod = mraw.pod) r
            JOIN owners o ON o.owner = r.own;""")
        sums = self._source('metrics_sum')
        if sums is not None:
            # Cumulative counters, two rows (directions) per pod and sample, refreshed about every 30 s:
            # sum the directions, keep the last sample of each 30-second bucket, and differentiate.
            ssrc, scols = sums
            pod = self._col(scols, 'attr.k8s.pod.name')
            self.con.execute(f"""
                INSERT INTO m
                SELECT CASE WHEN ts < {win.abnormal[0]} THEN 'normal' ELSE 'abnormal' END, ts, metric, owner,
                       instance, value FROM (
                  SELECT ts, metric || ' (rate)' AS metric, owner, instance,
                         greatest(v - lag(v) OVER p, 0) / nullif(ts - lag(ts) OVER p, 0) AS value
                  FROM (SELECT metric, owner, instance, max(ts) AS ts, arg_max(v, ts) AS v
                        FROM (SELECT epoch(time) AS ts, metric, coalesce(nullif(service_name, ''), pm.owner) AS owner,
                                     {pod} AS instance, sum(value) AS v
                              FROM {ssrc} LEFT JOIN pod_map pm ON pm.pod = {pod}
                              WHERE metric IN ('k8s.pod.network.io', 'k8s.pod.network.errors')
                                AND coalesce({pod}, '') <> ''
                              GROUP BY ALL)
                        WHERE owner IN (SELECT owner FROM owners)
                        GROUP BY metric, owner, instance, floor((ts - {win.start}) / 30))
                  WINDOW p AS (PARTITION BY metric, owner, instance ORDER BY ts))
                WHERE value IS NOT NULL""")
        chosen = self._choose_metrics(steady)
        if not chosen:
            return {}
        b = max(1, math.ceil((win.end - win.start) / MAX_POINTS))
        keys = sorted(chosen)
        self.con.register('chosen', pa.table({'owner': [k[0] for k in keys], 'metric': [k[1] for k in keys],
                                              'instance': [k[2] for k in keys]}))
        points: dict[tuple, list] = {}
        for owner, metric, inst, k, v in self._rows(f"""
                SELECT owner, metric, instance, floor((ts - {win.start}) / {b})::BIGINT AS k, avg(value)
                FROM m JOIN chosen USING (owner, metric, instance)
                WHERE ts >= {win.start} AND ts <= {win.end} GROUP BY ALL ORDER BY 1, 2, 3, 4"""):
            if v is not None and math.isfinite(v):
                points.setdefault((owner, metric, inst), []).append({'t': win.start + int(k) * b, 'v': _sig(v)})
        out: dict[str, list[dict]] = {}
        for key in sorted(chosen, key=chosen.get):
            owner, metric, inst = key
            if key not in points:
                continue
            series = {'name': metric, 'instance': inst, 'points': points[key]}
            unit = _metric_unit(metric)
            if unit:
                series['unit'] = unit
            out.setdefault(owner, []).append(series)
        return out

    def _choose_metrics(self, steady: set[str]) -> dict[tuple, int]:
        """Up to METRIC_CAP series per owner: the preference list first, then the largest relative change
        (at least MIN_CHANGE, except for owners in `steady`)."""
        pref = {m: i for i, m in enumerate(PREFERRED_METRICS)}
        by_owner: dict[str, list] = {}
        for owner, metric, inst, mn, ma, lo, hi in self._rows("""
                SELECT owner, metric, instance, avg(value) FILTER (WHERE w = 'normal'),
                       avg(value) FILTER (WHERE w = 'abnormal'), min(value), max(value)
                FROM m GROUP BY ALL"""):
            by_owner.setdefault(owner, []).append((metric, inst, mn, ma, lo, hi))
        chosen: dict[tuple, int] = {}
        for owner, rows in by_owner.items():
            preferred = sorted((r for r in rows if r[0] in pref), key=lambda r: (pref[r[0]], r[1]))[:PREFERRED_CAP]

            def change(r):
                _, _, mn, ma, lo, hi = r
                if mn is None or ma is None:
                    return 1.0
                return abs(ma - mn) / max(abs(ma), abs(mn), 1e-12)

            rest = sorted((r for r in rows if r[0] not in pref and (owner in steady or change(r) >= MIN_CHANGE)),
                          key=lambda r: (-change(r), r[0], r[1]))
            for i, r in enumerate(preferred + rest[:METRIC_CAP - len(preferred)]):
                chosen[(owner, r[0], r[1])] = i
        return chosen

    # logs

    def logs(self, owners: set[str], steady: set[str] = frozenset()) -> dict[str, list[dict]]:
        """Log templates per owner that changed between the windows or are new, up to LOG_CAP of each; owners
        in `steady` (components with no spans, whose logs are all the evidence) are topped up to LOG_CAP with
        their most frequent other templates."""
        src = self._source('logs')
        if src is None or not owners:
            return {}
        src, cols = src
        tmpl = self._col(cols, 'attr.log_template', "''")
        agg: dict[tuple[str, str], dict] = {}
        for svc, w, lvl, t, msg, n in self._rows(f"""
                SELECT service_name, w, upper(coalesce(level, '')), coalesce({tmpl}, ''), coalesce(message, ''), count(*)
                FROM {src} WHERE coalesce(service_name, '') <> '' GROUP BY ALL"""):
            if svc not in owners:
                continue
            key = (svc, t.strip()[:300] if t.strip() else log_template(msg))
            a = agg.setdefault(key, {'normal': 0, 'abnormal': 0, 'levels': {}, 'sample': {}})
            a[w] += n
            lvl = _LEVELS.get(lvl, lvl)
            if lvl:
                a['levels'][lvl] = a['levels'].get(lvl, 0) + n
            best = a['sample'].get(w)
            if best is None or (-n, msg) < (-best[1], best[0]):  # most frequent, then first in sort order
                a['sample'][w] = (msg, n)
        by_owner: dict[str, list] = {}
        for (svc, t), a in agg.items():
            by_owner.setdefault(svc, []).append((t, a))
        out = {}
        for svc, rows in by_owner.items():
            rows.sort(key=lambda x: (-abs(x[1]['abnormal'] - x[1]['normal']), -x[1]['abnormal'], x[0]))
            changed = [r for r in rows if r[1]['abnormal'] != r[1]['normal']][:LOG_CAP]
            taken = {r[0] for r in changed}
            new = [r for r in rows if r[1]['normal'] == 0 and r[1]['abnormal'] > 0 and r[0] not in taken][:LOG_CAP]
            if svc in steady:
                taken |= {r[0] for r in new}
                rest = sorted((r for r in rows if r[0] not in taken),
                              key=lambda x: (-(x[1]['normal'] + x[1]['abnormal']), x[0]))
                new += rest[:max(0, LOG_CAP - len(changed) - len(new))]
            stats = []
            for t, a in sorted(changed + new, key=lambda x: (-abs(x[1]['abnormal'] - x[1]['normal']), x[0])):
                s = {'template': t, 'normal': a['normal'], 'abnormal': a['abnormal']}
                if a['levels']:
                    s['level'] = min(a['levels'], key=lambda lv: (-a['levels'][lv], lv))
                sample = (a['sample'].get('abnormal') or a['sample'].get('normal') or ('', 0))[0]
                if sample:
                    s['sample'] = sample[:500]
                stats.append(s)
            if stats:
                out[svc] = stats
        return out


def export_case(case_dir: str | Path, out_root: str | Path, *, context_id: str | None = None,
                title: str | None = None, extra_nodes: tuple[str, ...] | list[str] = (),
                bucket_seconds: int = 30, threads: int = 2) -> dict:
    """Write `<out_root>/contexts/<contextId>/` for one case; returns a summary."""
    started = time.time()
    files = CaseFiles(case_dir)
    env, inj = files.json('env.json'), files.json('injection.json')
    win = read_windows(env)
    faults = parse_faults(inj)
    case_name = inj.get('name') or inj.get('injection_name') or files.dir.name
    cid = context_id or safe_id(files.dir.name)
    system = system_of(inj, env)

    ex = _Exporter(files, threads)
    ex.load_traces(win, bucket_seconds)

    # Nodes: every service in the traces; every component the metrics or logs name that emits no spans
    # (a broker, a database, a cache, or a service idle in both windows); fault targets and requested
    # services, which may appear nowhere.
    names = ex.services()
    untraced = {c: node_kind(c) for c in sorted(ex.telemetry_services() - set(names))}
    names += list(untraced)
    ex.add_untraced_calls(untraced)
    targets = {f.target for f in faults if f.target}
    peers = {f.peer for f in faults if f.peer} - targets
    for extra in [*sorted(targets | peers), *extra_nodes]:
        if extra and extra not in names:
            names.append(extra)
    taken: set[str] = set()
    node_id = {s: _unique(safe_id(s), taken) for s in names}

    link_stats = ex.grouped('allcalls', 'caller, callee')
    pl_stats = ex.grouped('allcalls', 'caller, callee, cport, sport')
    basis = ex.link_basis()
    node_stats = ex.grouped('entry', 'svc')
    label_stats = ex.grouped('spans', 'svc, label')
    roles = ex.port_roles()
    split = ex.client_split()

    # Ports, keyed (service, span name, callee, callee span name). A server port has callee None. A
    # client port is split by the endpoint it reached, so a bare `POST` span becomes one port per callee
    # endpoint, plus one for the spans that reached no other service.
    port_stats: dict[tuple, dict] = {}
    for (svc, lbl), role in roles.items():
        if role == 'server':
            port_stats[(svc, lbl, None, None)] = label_stats.get((svc, lbl), {})
    for (svc, lbl, callee, clabel), st in split.items():
        if roles.get((svc, lbl)) == 'client':
            port_stats[(svc, lbl, callee, clabel)] = st
    # A component without spans has the ports its calls name: a server port per caller span name that
    # reached it, and a client port per consumer service and span name it delivered to.
    for (k, lbl), st in ex.grouped('vcalls', 'callee, sport', "WHERE basis = 'caller-spans'").items():
        roles[(k, lbl)] = 'server'
        port_stats[(k, lbl, None, None)] = st
    for (k, lbl, consumer, clbl), st in ex.grouped('vcalls', 'caller, cport, callee, sport',
                                                   "WHERE basis = 'callee-spans'").items():
        if roles.setdefault((k, lbl), 'client') == 'client':
            port_stats[(k, lbl, consumer, clbl)] = st
    fanout: dict[tuple[str, str], int] = {}
    for svc, lbl, callee, _ in port_stats:
        if callee is not None:
            fanout[(svc, lbl)] = fanout.get((svc, lbl), 0) + 1

    def port_title(key: tuple) -> str:
        svc, lbl, callee, clabel = key
        if callee is None:
            return f'{lbl} (no callee span)' if fanout.get((svc, lbl)) else lbl
        if svc in untraced or callee in untraced:  # the callee span name is the caller's own
            return lbl if fanout[(svc, lbl)] == 1 else f'{lbl} → {callee}'
        if _BARE_METHOD.match(lbl):
            method = lbl.split()[-1]
            return clabel if clabel.startswith(method + ' ') else f'{lbl} → {clabel}'
        return f'{lbl} → {clabel}' if fanout[(svc, lbl)] > 1 else lbl

    def port_key(svc: str, lbl: str, callee: str | None = None, clabel: str | None = None) -> tuple:
        """The port a span of `svc` named `lbl` belongs to, given the endpoint it called."""
        if roles.get((svc, lbl)) != 'client':
            return (svc, lbl, None, None)
        for k in ((svc, lbl, callee, clabel), (svc, lbl, None, None)):
            if k in port_stats:
                return k
        return min(k for k in port_stats if k[:2] == (svc, lbl))

    # Port links: the busiest port pairs of each link.
    kept_pl: dict[tuple[str, str], list[tuple[str, str, dict]]] = {}
    for (a, b, cp, sp), st in pl_stats.items():
        kept_pl.setdefault((a, b), []).append((cp, sp, st))
    for k in kept_pl:
        kept_pl[k] = sorted(kept_pl[k], key=lambda x: (-_volume(x[2]), x[0], x[1]))[:PORT_LINK_CAP]
    needed = {port_key(a, cp, b, sp) for (a, b), pls in kept_pl.items() for cp, sp, _ in pls}
    needed |= {port_key(b, sp) for (_, b), pls in kept_pl.items() for _, sp, _ in pls}
    for k in needed - port_stats.keys():  # a callee span name with no role of its own
        roles.setdefault(k[:2], 'server')
        port_stats[k] = label_stats.get(k[:2], {})

    port_id: dict[tuple, str] = {}
    by_service: dict[str, list[tuple]] = {}
    for key in port_stats:
        by_service.setdefault(key[0], []).append(key)
    nodes = []
    for svc in names:
        ports, taken_ports = [], set()
        for role, prefix in (('server', 's.'), ('client', 'c.')):
            ranked = sorted((k for k in by_service.get(svc, []) if roles[k[:2]] == role),
                            key=lambda k: (-_volume(port_stats[k]), port_title(k)))
            keep = [k for k in ranked if k in needed]
            keep += [k for k in ranked if k not in needed][:max(0, PORT_CAP - len(keep))]
            for k in sorted(keep, key=ranked.index):
                label = port_title(k)
                pid = _unique(prefix + safe_id(label, 80), taken_ports)
                port_id[k] = pid
                ports.append({'id': pid, 'label': label, 'role': role, 'stats': _pair(port_stats[k])})
        tags = ((['fault-target'] if svc in targets else []) + (['fault-peer'] if svc in peers else [])
                + (['no-traces'] if svc in untraced else []))
        nodes.append({'id': node_id[svc], 'label': svc, 'kind': node_kind(svc), 'tags': tags, 'ports': ports,
                      'stats': _pair(node_stats.get((svc,), {})), 'hasDetail': False})

    # Links and their series.
    nb = max(1, math.ceil((win.end - win.start) / bucket_seconds))
    link_series = ex.series('caller, callee')
    port_series = ex.series('caller, callee, cport, sport')

    def points(by_bucket: dict[int, tuple]) -> list[dict]:
        out = []
        for k in range(nb):
            p = {'t': win.start + k * bucket_seconds, **_window_stats(by_bucket.get(k))}
            out.append(p)
        return out

    links, series_docs = [], {}
    link_taken: set[str] = set()
    for (a, b), st in sorted(link_stats.items(), key=lambda x: (-_volume(x[1]), x[0])):
        lid = _unique(safe_id(f'{node_id[a]}__{node_id[b]}', 160), link_taken)
        pls = [{'sourcePort': port_id[port_key(a, cp, b, sp)], 'targetPort': port_id[port_key(b, sp)],
                'stats': _pair(pst)} for cp, sp, pst in kept_pl.get((a, b), [])]
        links.append({'id': lid, 'source': node_id[a], 'target': node_id[b], 'kind': 'call', 'stats': _pair(st),
                      'ports': pls, 'basis': basis.get((a, b), 'spans'), 'hasSeries': True})
        series_docs[lid] = {
            'linkId': lid, 'bucketSeconds': bucket_seconds, 'points': points(link_series.get((a, b), {})),
            'ports': [{'sourcePort': port_id[port_key(a, cp, b, sp)], 'targetPort': port_id[port_key(b, sp)],
                       'points': points(port_series.get((a, b, cp, sp), {}))}
                      for cp, sp, _ in kept_pl.get((a, b), [])]}

    # Node details.
    owners = set(names)
    metrics = ex.metrics(owners, ex.pods_from_traces(), win, steady=set(untraced))
    logs = ex.logs(owners, steady=set(untraced))
    details = {}
    for n in nodes:
        svc = n['label']
        if metrics.get(svc) or logs.get(svc):
            details[n['id']] = {'nodeId': n['id'], 'metrics': metrics.get(svc, []), 'logs': logs.get(svc, [])}
            n['hasDetail'] = True

    inj_at = _iso_to_unix(inj.get('start_time')) or win.abnormal[0]
    inj_end = _iso_to_unix(inj.get('end_time'))
    markers = [{'at': inj_at, 'label': 'Injection: ' + '; '.join(f.summary() for f in faults) if faults else 'Injection',
                'kind': 'injection'}]
    facts = [{'label': 'System', 'value': system}, {'label': 'Case', 'value': case_name, 'kind': 'mono'}]
    if env.get('NAMESPACE'):
        facts.append({'label': 'Namespace', 'value': env['NAMESPACE'], 'kind': 'mono'})
    for f in faults:
        params = ', '.join(f'{k}={v}' for k, v in sorted(f.params.items()) if v not in (None, '', [], {}))
        facts.append({'label': 'Fault', 'value': f.summary() + (f' ({params})' if params else '')})
    facts.append({'label': 'Injection start', 'value': str(inj_at), 'kind': 'time'})
    if inj_end:
        facts.append({'label': 'Injection end', 'value': str(inj_end), 'kind': 'time'})
    context = {'id': cid, 'title': title or case_name, 'group': system,
               'windows': [{'name': 'normal', 'start': win.normal[0], 'end': win.normal[1]},
                           {'name': 'abnormal', 'start': win.abnormal[0], 'end': win.abnormal[1]}],
               'markers': markers, 'facts': facts}
    topology = {'context': context, 'nodes': nodes, 'links': links}

    # Validate everything, then swap the context folder in whole.
    check_topology(topology, f'{cid}/topology')
    for nid, d in details.items():
        check(d, 'NodeDetail', where=f'{cid}/nodes/{nid}')
    for lid, d in series_docs.items():
        check(d, 'LinkSeries', where=f'{cid}/links/{lid}/series')
    out_root = Path(out_root)
    final = out_root / 'contexts' / cid
    tmp = out_root / 'contexts' / f'.{cid}.tmp-{os.getpid()}'
    shutil.rmtree(tmp, ignore_errors=True)
    sizes = {}

    def write(rel: str, doc) -> None:
        p = tmp / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        data = json.dumps(doc, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
        p.write_text(data)
        sizes[rel] = len(data.encode())

    write('topology.json', topology)
    for nid, d in details.items():
        write(f'nodes/{nid}.json', d)
    for lid, d in series_docs.items():
        write(f'links/{lid}/series.json', d)
    old = out_root / 'contexts' / f'.{cid}.old-{os.getpid()}'
    if final.exists():
        final.rename(old)
    tmp.rename(final)
    shutil.rmtree(old, ignore_errors=True)
    largest = max(sizes, key=sizes.get)
    by_basis: dict[str, int] = {}
    for link in links:
        by_basis[link['basis']] = by_basis.get(link['basis'], 0) + 1
    return {'contextId': cid, 'case': str(files.dir), 'nodes': len(nodes), 'links': len(links),
            'untracedNodes': len(untraced), 'linksByBasis': by_basis,
            'nodeDetails': len(details), 'files': len(sizes), 'bytes': sum(sizes.values()),
            'largest': {'file': largest, 'bytes': sizes[largest]}, 'seconds': round(time.time() - started, 2)}


def list_services(case_dir: str | Path) -> dict[str, list[str]]:
    """The service names each kind of telemetry of a case knows, e.g. to resolve a name given in another form."""
    ex = _Exporter(CaseFiles(case_dir), threads=2)
    out = {}
    for kind in ('traces', 'metrics', 'logs'):
        src = ex._source(kind)
        out[kind] = [] if src is None else [r[0] for r in ex._rows(
            f"SELECT DISTINCT service_name FROM {src[0]} WHERE coalesce(service_name, '') <> '' ORDER BY 1")]
    return out


def _export_spec(spec: dict, out_root: str, threads: int) -> dict:
    return export_case(spec['dir'], out_root, context_id=spec.get('contextId'), title=spec.get('title'),
                       extra_nodes=tuple(spec.get('extraNodes', ())), threads=threads)


def export_cases(specs: list[dict], out_root: str | Path, *, jobs: int = 8, threads: int = 2,
                 log=lambda s: print(s, file=sys.stderr)) -> list[dict]:
    """Export several cases in a process pool. Raises on the first failure, after the others finish."""
    (Path(out_root) / 'contexts').mkdir(parents=True, exist_ok=True)
    results, errors = [], []
    with cf.ProcessPoolExecutor(max_workers=max(1, min(jobs, len(specs)))) as pool:
        futs = {pool.submit(_export_spec, s, str(out_root), threads): s for s in specs}
        for fut in cf.as_completed(futs):
            s = futs[fut]
            try:
                r = fut.result()
            except Exception as e:  # noqa: BLE001 - reported, then re-raised below
                errors.append(f'{s["dir"]}: {type(e).__name__}: {e}')
                log(f'FAIL {s["dir"]}: {e}')
                continue
            results.append(r)
            log(f'ok   {r["contextId"]}: {r["nodes"]} nodes, {r["links"]} links, '
                f'{r["bytes"] / 1e6:.2f} MB in {r["seconds"]} s')
    if errors:
        raise RuntimeError(f'{len(errors)} case(s) failed:\n  ' + '\n  '.join(errors))
    return sorted(results, key=lambda r: r['contextId'])


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('cases', nargs='*', help='case directories')
    ap.add_argument('--out', help='review folder to write contexts/<contextId>/ into')
    ap.add_argument('--list-services', action='store_true',
                    help='print the service names in the traces, metrics and logs of each case instead')
    ap.add_argument('--spec', help='JSON list of {"dir", "contextId"?, "title"?, "extraNodes"?}')
    ap.add_argument('--jobs', type=int, default=8, help='cases exported in parallel (default 8)')
    ap.add_argument('--threads', type=int, default=2, help='duckdb threads per case (default 2)')
    a = ap.parse_args(argv)
    if a.list_services:
        for c in a.cases:
            print(json.dumps({'case': c, **list_services(c)}))
        return 0
    if not a.out:
        ap.error('--out is required')
    specs = [{'dir': c} for c in a.cases]
    if a.spec:
        specs += json.loads(Path(a.spec).read_text())
    if not specs:
        ap.error('give case directories or --spec')
    started = time.time()
    try:
        results = export_cases(specs, a.out, jobs=a.jobs, threads=a.threads)
    except Exception as e:  # noqa: BLE001
        print(e, file=sys.stderr)
        return 1
    for r in results:
        print(json.dumps(r))
    total = sum(r['bytes'] for r in results)
    print(f'{len(results)} case(s), {total / 1e6:.1f} MB, {time.time() - started:.1f} s', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
