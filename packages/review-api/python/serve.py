#!/usr/bin/env python3
"""Reference server of the review API: serves a review folder and saves verdicts. Standard library only.

    python3 serve.py --root <folder> [--host 127.0.0.1] [--port 8768] [--read-only] [--ui <built SPA dir>]

`GET /api/review/<path>` answers with `<root>/<path>.json`; `GET /api/review/server` with
`server.json` if present (its `writable` set to what this server can do) or a generated ServerInfo;
`GET /api/review/tasks/{t}/verdicts/{r}` with `[]` while that reviewer has saved nothing.
`PUT /api/review/tasks/{t}/verdicts/{r}/{itemId}` checks the ids and the value against the task, then
upserts the verdict into `tasks/{t}/verdicts/{r}.json` atomically. Errors are `{"message": ...}`
with status 400, 404 or 405. CORS is open so a dev server on another origin can call the API.
With `--ui`, other paths serve the SPA in that folder, falling back to its index.html.
"""
from __future__ import annotations

import argparse
import gzip
import json
import mimetypes
import os
import re
import sys
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

PREFIX = '/api/review'
SAFE_ID = re.compile(r'^[A-Za-z0-9._-]+$')
VERSION = '0.1.0'
MAX_BODY = 64 * 1024


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status, self.message = status, message


def _safe(seg: str, what: str = 'path segment') -> str:
    if not SAFE_ID.match(seg) or seg in ('.', '..'):
        raise ApiError(400, f'{what} {seg!r} is not a SafeId (^[A-Za-z0-9._-]+$)')
    return seg


class Store:
    """The review folder: JSON files read on demand, verdict files written atomically."""

    def __init__(self, root: Path, writable: bool):
        self.root = root.resolve()
        self.writable = writable
        self._locks: dict[Path, threading.Lock] = {}
        self._locks_guard = threading.Lock()
        self._cache: dict[Path, tuple[float, object]] = {}

    def file(self, segments: list[str]) -> Path:
        path = self.root.joinpath(*segments[:-1], segments[-1] + '.json').resolve()
        if not path.is_relative_to(self.root):
            raise ApiError(400, 'path leaves the review folder')
        return path

    def read_json(self, path: Path):
        """Parsed JSON, cached until the file changes."""
        try:
            mtime = path.stat().st_mtime_ns
        except FileNotFoundError:
            raise ApiError(404, f'{path.relative_to(self.root)} not found') from None
        hit = self._cache.get(path)
        if hit and hit[0] == mtime:
            return hit[1]
        doc = json.loads(path.read_text())
        self._cache[path] = (mtime, doc)
        return doc

    def server_info(self) -> dict:
        info = {'name': 'review-api reference server (python)', 'version': VERSION}
        p = self.root / 'server.json'
        if p.is_file():
            info.update(json.loads(p.read_text()))
        info['writable'] = self.writable
        return info

    def task(self, task_id: str) -> dict:
        return self.read_json(self.file(['tasks', task_id]))

    def lock(self, path: Path) -> threading.Lock:
        with self._locks_guard:
            return self._locks.setdefault(path, threading.Lock())

    def put_verdict(self, task_id: str, reviewer: str, item_id: str, body: dict) -> dict:
        if not self.writable:
            raise ApiError(405, 'this server is read-only')
        task = self.task(task_id)
        items = self.read_json(self.file(['tasks', task_id, 'items']))
        if item_id not in {it['id'] for it in items}:
            raise ApiError(404, f'task {task_id} has no item {item_id}')
        if not isinstance(body, dict) or not isinstance(body.get('value'), str):
            raise ApiError(400, 'body must be {"value": string, "note"?: string}')
        note = body.get('note', '')
        if not isinstance(note, str):
            raise ApiError(400, 'note must be a string')
        values = [o['value'] for o in task['verdictOptions']]
        if body['value'] not in values:
            raise ApiError(400, f'value {body["value"]!r} is not one of {values}')
        verdict = {'itemId': item_id, 'reviewer': reviewer, 'value': body['value'], 'note': note,
                   'updatedAt': int(time.time())}
        path = self.file(['tasks', task_id, 'verdicts', reviewer])
        with self.lock(path):
            verdicts = json.loads(path.read_text()) if path.is_file() else []
            for i, v in enumerate(verdicts):
                if v['itemId'] == item_id:
                    verdicts[i] = verdict
                    break
            else:
                verdicts.append(verdict)
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_name(f'.{path.name}.{os.getpid()}.{threading.get_ident()}.tmp')
            tmp.write_text(json.dumps(verdicts, ensure_ascii=False, indent=1))
            os.replace(tmp, path)
        return verdict


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = f'review-api/{VERSION}'
    store: Store
    ui: Path | None

    # plumbing

    def _cors(self) -> None:
        self.send_header('Access-Control-Allow-Origin', self.headers.get('Origin') or '*')
        self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '600')

    def _send(self, status: int, data: bytes, ctype: str, cache: str = 'no-cache') -> None:
        gz = len(data) > 2048 and 'gzip' in self.headers.get('Accept-Encoding', '') and (
            ctype.startswith('application/json') or ctype.startswith('text/') or ctype.endswith('javascript'))
        if gz:
            data = gzip.compress(data, 5)
        self.send_response(status)
        self._cors()
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', cache)
        if gz:
            self.send_header('Content-Encoding', 'gzip')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)

    def _json(self, status: int, doc) -> None:
        self._send(status, json.dumps(doc, ensure_ascii=False).encode(), 'application/json; charset=utf-8')

    def _error(self, status: int, message: str) -> None:
        self._json(status, {'message': message})

    def _api_segments(self) -> list[str] | None:
        path = urlsplit(self.path).path
        if path != PREFIX and not path.startswith(PREFIX + '/'):
            return None
        rest = path[len(PREFIX):].strip('/')
        return [unquote(s) for s in rest.split('/')] if rest else []

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write(f'{self.log_date_time_string()} {self.address_string()} {fmt % args}\n')

    # methods

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        self._cors()
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        segs = self._api_segments()
        if segs is None:
            return self._static()
        try:
            if not segs:
                raise ApiError(404, 'no resource at the API root')
            for s in segs:
                _safe(s)
            if segs == ['server']:
                return self._json(200, self.store.server_info())
            path = self.store.file(segs)
            if len(segs) == 4 and segs[0] == 'tasks' and segs[2] == 'verdicts' and not path.is_file():
                self.store.task(segs[1])  # 404 for an unknown task
                return self._json(200, [])
            if not path.is_file():
                raise ApiError(404, f'{"/".join(segs)} not found')
            self._send(200, path.read_bytes(), 'application/json; charset=utf-8')
        except ApiError as e:
            self._error(e.status, e.message)

    do_HEAD = do_GET

    def do_PUT(self) -> None:  # noqa: N802
        segs = self._api_segments()
        try:
            if segs is None or len(segs) != 5 or segs[0] != 'tasks' or segs[2] != 'verdicts':
                raise ApiError(405, 'PUT is only allowed on /api/review/tasks/{taskId}/verdicts/{reviewer}/{itemId}')
            task_id, reviewer, item_id = (_safe(segs[1], 'taskId'), _safe(segs[3], 'reviewer'),
                                          _safe(segs[4], 'itemId'))
            length = int(self.headers.get('Content-Length') or 0)
            if length > MAX_BODY:
                raise ApiError(400, 'body too large')
            raw = self.rfile.read(length) if length else b''
            try:
                body = json.loads(raw or b'null')
            except ValueError:
                raise ApiError(400, 'body is not JSON') from None
            self._json(200, self.store.put_verdict(task_id, reviewer, item_id, body))
        except ApiError as e:
            self._error(e.status, e.message)

    def _not_allowed(self) -> None:
        length = int(self.headers.get('Content-Length') or 0)
        if 0 < length <= MAX_BODY:
            self.rfile.read(length)
        self._error(405, f'{self.command} is not allowed')

    do_POST = do_DELETE = do_PATCH = _not_allowed

    def _static(self) -> None:
        if self.ui is None:
            return self._error(404, 'not found (the API is under /api/review)')
        rel = unquote(urlsplit(self.path).path).lstrip('/')
        path = (self.ui / rel).resolve()
        if not path.is_relative_to(self.ui) or not path.is_file():
            path = self.ui / 'index.html'  # client-side route
        if not path.is_file():
            return self._error(404, 'the UI folder has no index.html')
        ctype = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
        cache = 'no-cache' if path.name == 'index.html' else 'public, max-age=3600'
        self._send(200, path.read_bytes(), ctype, cache)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--root', required=True, help='review folder')
    ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument('--port', type=int, default=8768)
    ap.add_argument('--read-only', action='store_true', help='refuse PUT (writable=false)')
    ap.add_argument('--ui', help='folder of a built SPA to serve at /')
    a = ap.parse_args(argv)
    root = Path(a.root)
    if not root.is_dir():
        ap.error(f'{root} is not a directory')
    Handler.store = Store(root, writable=not a.read_only)
    Handler.ui = Path(a.ui).resolve() if a.ui else None
    httpd = ThreadingHTTPServer((a.host, a.port), Handler)
    httpd.daemon_threads = True
    mode = 'read-only' if a.read_only else 'writable'
    print(f'serving {root.resolve()} ({mode}) at http://{a.host}:{a.port}{PREFIX}/'
          + (f' and the UI {Handler.ui} at /' if Handler.ui else ''), file=sys.stderr, flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
