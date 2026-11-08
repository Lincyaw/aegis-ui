#!/usr/bin/env python3
"""The review API contract as JSON-schema validators, and a checker for a whole review folder.

The schemas come from `../generated/openapi.yaml` (compiled from `main.tsp`), so a change to the
contract reaches these checks on the next `pnpm -F @lincyaw/review-api build`.

    python3 contract.py <root>        # validate every JSON file of a review folder; exit 1 on any error

A review folder maps `GET /api/review/<path>` to `<root>/<path>.json`. `check_folder` knows which
schema each path must satisfy and also checks what a schema cannot: ids that refer to each other
(links to nodes, port links to ports, items to contexts and focus nodes, verdicts to items and
options) and the `hasDetail` / `hasSeries` flags against the files that exist.
"""
from __future__ import annotations

import functools
import json
import sys
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator

OPENAPI = Path(__file__).resolve().parent.parent / 'generated' / 'openapi.yaml'


class ContractError(ValueError):
    """A document does not satisfy the contract."""


@functools.cache
def _components() -> dict:
    return yaml.safe_load(OPENAPI.read_text())['components']


@functools.cache
def _validator(name: str, array: bool) -> Draft202012Validator:
    ref = {'$ref': f'#/components/schemas/{name}'}
    schema = {'type': 'array', 'items': ref} if array else dict(ref)
    schema['components'] = _components()
    return Draft202012Validator(schema)


def check(doc, name: str, *, array: bool = False, where: str = '') -> None:
    """Raise ContractError unless `doc` is a `name` (or a list of them)."""
    errors = sorted(_validator(name, array).iter_errors(doc), key=lambda e: list(map(str, e.absolute_path)))
    if errors:
        shown = '; '.join(f"/{'/'.join(map(str, e.absolute_path))}: {e.message[:200]}" for e in errors[:5])
        more = f' (+{len(errors) - 5} more)' if len(errors) > 5 else ''
        raise ContractError(f'{where or name}: not a valid {name}{"[]" if array else ""}: {shown}{more}')


def check_topology(topo: dict, where: str = '') -> None:
    """Schema plus the references inside one Topology."""
    check(topo, 'Topology', where=where)
    problems = []
    nodes = {}
    for n in topo['nodes']:
        if n['id'] in nodes:
            problems.append(f'duplicate node id {n["id"]}')
        ports = {}
        for p in n['ports']:
            if p['id'] in ports:
                problems.append(f'node {n["id"]}: duplicate port id {p["id"]}')
            ports[p['id']] = p['role']
        nodes[n['id']] = ports
    seen = set()
    for link in topo['links']:
        if link['id'] in seen:
            problems.append(f'duplicate link id {link["id"]}')
        seen.add(link['id'])
        src, dst = nodes.get(link['source']), nodes.get(link['target'])
        if src is None or dst is None:
            problems.append(f'link {link["id"]}: endpoint not among the nodes')
            continue
        for pl in link['ports']:
            if pl['sourcePort'] not in src:
                problems.append(f'link {link["id"]}: sourcePort {pl["sourcePort"]} is not a port of {link["source"]}')
            if pl['targetPort'] not in dst:
                problems.append(f'link {link["id"]}: targetPort {pl["targetPort"]} is not a port of {link["target"]}')
    if problems:
        raise ContractError(f'{where or "topology"}: ' + '; '.join(problems[:10]))


def _load(path: Path):
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as e:
        raise ContractError(f'{path}: not JSON: {e}') from None


def check_folder(root: Path) -> dict:
    """Validate every JSON file under `root`. Returns counts per kind; raises ContractError listing all problems."""
    root = Path(root)
    problems: list[str] = []
    counts: dict[str, int] = {}

    def guard(fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except ContractError as e:
            problems.append(str(e))
            return None

    def schema_of(rel: Path) -> tuple[str, bool] | None:
        p = rel.parts
        if p == ('server.json',):
            return 'ServerInfo', False
        if p == ('tasks.json',):
            return 'TaskSummary', True
        if len(p) == 2 and p[0] == 'tasks':
            return 'Task', False
        if len(p) == 3 and p[0] == 'tasks' and p[2] == 'items.json':
            return 'Item', True
        if len(p) == 4 and p[0] == 'tasks' and p[2] == 'verdicts':
            return 'Verdict', True
        if len(p) == 3 and p[0] == 'contexts' and p[2] == 'topology.json':
            return 'Topology', False
        if len(p) == 4 and p[0] == 'contexts' and p[2] == 'nodes':
            return 'NodeDetail', False
        if len(p) == 5 and p[0] == 'contexts' and p[2] == 'links' and p[4] == 'series.json':
            return 'LinkSeries', False
        return None

    docs: dict[Path, object] = {}
    for path in sorted(root.rglob('*.json')):
        rel = path.relative_to(root)
        if any(part.startswith('.') for part in rel.parts):
            continue  # temporary files of an atomic write
        kind = schema_of(rel)
        if kind is None:
            problems.append(f'{rel}: no GET of the contract maps to this file')
            continue
        doc = guard(_load, path)
        if doc is None:
            continue
        name, array = kind
        if name == 'Topology':
            guard(check_topology, doc, str(rel))
        else:
            guard(check, doc, name, array=array, where=str(rel))
        docs[rel] = doc
        counts[name] = counts.get(name, 0) + 1

    # References that cross files.
    topologies = {rel.parts[1]: d for rel, d in docs.items() if rel.name == 'topology.json'}
    for cid, topo in topologies.items():
        if topo['context']['id'] != cid:
            problems.append(f'contexts/{cid}/topology.json: context.id is {topo["context"]["id"]}')
        base = root / 'contexts' / cid
        for n in topo['nodes']:
            if n['hasDetail'] != (base / 'nodes' / f'{n["id"]}.json').is_file():
                problems.append(f'contexts/{cid}: node {n["id"]} hasDetail={n["hasDetail"]} disagrees with the files')
        for link in topo['links']:
            if link['hasSeries'] != (base / 'links' / link['id'] / 'series.json').is_file():
                problems.append(f'contexts/{cid}: link {link["id"]} hasSeries={link["hasSeries"]} disagrees with the files')
    for rel, d in docs.items():
        if rel.parts[0] == 'contexts' and rel.parts[2] == 'nodes' and d.get('nodeId') != rel.stem:
            problems.append(f'{rel}: nodeId is {d.get("nodeId")}')
        if rel.parts[0] == 'contexts' and rel.parts[2] == 'links' and d.get('linkId') != rel.parts[3]:
            problems.append(f'{rel}: linkId is {d.get("linkId")}')

    summaries = {t['id']: t for t in docs.get(Path('tasks.json'), []) or []}
    for rel, task in docs.items():
        if not (len(rel.parts) == 2 and rel.parts[0] == 'tasks'):
            continue
        tid = rel.stem
        if task['id'] != tid:
            problems.append(f'{rel}: id is {task["id"]}')
        if tid not in summaries:
            problems.append(f'{rel}: task missing from tasks.json')
        items = docs.get(Path('tasks') / tid / 'items.json')
        if items is None:
            problems.append(f'tasks/{tid}/items.json is missing')
            continue
        ids = [it['id'] for it in items]
        if len(set(ids)) != len(ids):
            problems.append(f'tasks/{tid}/items.json: duplicate item ids')
        for summary in (task, summaries.get(tid)):
            if summary and summary['itemCount'] != len(items):
                problems.append(f'task {tid}: itemCount {summary["itemCount"]} but {len(items)} items')
            if summary and summary.get('groups') is not None:
                want = {}
                for it in items:
                    want[it.get('group')] = want.get(it.get('group'), 0) + 1
                got = {g['group']: g['count'] for g in summary['groups']}
                if got != want:
                    problems.append(f'task {tid}: groups {got} disagree with the items {want}')
        for it in items:
            topo = topologies.get(it['contextId'])
            if topo is None:
                problems.append(f'task {tid} item {it["id"]}: context {it["contextId"]} has no topology')
                continue
            node_ids = {n['id'] for n in topo['nodes']}
            missing = [n for n in it['focus']['nodeIds'] if n not in node_ids]
            missing += [e for cl in it['focus']['claimedLinks'] for e in (cl['source'], cl['target']) if e not in node_ids]
            if missing:
                problems.append(f'task {tid} item {it["id"]}: focus nodes {sorted(set(missing))} not in the topology')
        values = {o['value'] for o in task['verdictOptions']}
        for vrel, verdicts in docs.items():
            if vrel.parts[:3] != ('tasks', tid, 'verdicts'):
                continue
            for v in verdicts:
                if v['itemId'] not in ids:
                    problems.append(f'{vrel}: verdict for unknown item {v["itemId"]}')
                if v['value'] not in values:
                    problems.append(f'{vrel}: value {v["value"]} is not an option')
                if v['reviewer'] != vrel.stem:
                    problems.append(f'{vrel}: reviewer {v["reviewer"]} in the file of {vrel.stem}')
    if problems:
        raise ContractError(f'{len(problems)} problem(s) in {root}:\n  ' + '\n  '.join(problems))
    return counts


def main(argv: list[str]) -> int:
    if len(argv) != 1 or argv[0] in ('-h', '--help'):
        print('usage: python3 contract.py <review-folder>', file=sys.stderr)
        return 2
    try:
        counts = check_folder(Path(argv[0]))
    except ContractError as e:
        print(e, file=sys.stderr)
        return 1
    print(json.dumps({'ok': True, 'files': counts}))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
