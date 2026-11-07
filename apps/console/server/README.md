# aegis-console binary

A single-file binary that serves the console SPA and reverse-proxies the
AegisLab gateway and ClickHouse, so the browser only ever talks to one
origin. It is written in Go and embeds the built SPA with `embed.FS`;
the executable is static and needs nothing else on the target machine.

## Build

Prerequisites: Node, pnpm, Go ≥ 1.23 (see `go.mod`).

```sh
# Host platform
pnpm -F @lincyaw/console bundle:host
./apps/console/bin/aegis-console --help

# Specific targets (cross-compiled)
pnpm -F @lincyaw/console bundle:linux-x64
pnpm -F @lincyaw/console bundle:linux-arm64
pnpm -F @lincyaw/console bundle:macos-x64
pnpm -F @lincyaw/console bundle:macos-arm64
pnpm -F @lincyaw/console bundle:windows-x64

# Everything
pnpm -F @lincyaw/console bundle:all
```

`bundle:host` writes `apps/console/bin/aegis-console`; the other
targets write `apps/console/bin/aegis-console-<os>-<arch>` (`linux`,
`darwin`, `windows`; `.exe` on Windows). The version
printed by `--version` comes from `$AEGIS_CONSOLE_VERSION`,
`$GITHUB_REF_NAME` or `git describe`.

## Run

```sh
# Local viewer: trajectories + gallery, no login
./aegis-console --clickhouse http://127.0.0.1:8123

# With a remote AegisLab gateway (enables the sign-in-protected apps)
./aegis-console \
  --gateway https://gw.example.com \
  --clickhouse http://127.0.0.1:8123 \
  --open

# From a JSON config file (CLI flags override file values)
./aegis-console --config ./aegis.json
```

| Flag                                         | Default                 | Meaning                                                                  |
| -------------------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `--port`                                     | `3323`                  | Port to listen on                                                        |
| `--host`                                     | `127.0.0.1`             | Bind address (`0.0.0.0` for LAN access)                                  |
| `--allowed-host`                             | none                    | Also accept requests addressed to this host name (repeatable; see below) |
| `--gateway`                                  | empty                   | AegisLab gateway URL; empty disables the proxy                           |
| `--clickhouse`                               | `http://127.0.0.1:8123` | ClickHouse HTTP endpoint                                                 |
| `--clickhouse-db`                            | `otel`                  | ClickHouse database                                                      |
| `--clickhouse-table`                         | `otel_traces`           | Traces table                                                             |
| `--clickhouse-logs-table`                    | `otel_logs`             | Logs table                                                               |
| `--clickhouse-user`, `--clickhouse-password` | empty                   | Optional ClickHouse credentials                                          |
| `--clickhouse-allow-remote`                  | off                     | Start with ClickHouse credentials on a non-loopback `--host` (see below) |
| `--sso-origin`                               | same as `--gateway`     | SSO origin                                                               |
| `--sso-client-id`                            | `aegis-console`         | OIDC client ID                                                           |
| `--sso-scope`                                | `openid profile email`  | OIDC scope                                                               |
| `--config`                                   | empty                   | JSON config file                                                         |
| `--open`                                     | off                     | Open the browser after starting                                          |
| `--bridge`                                   | off                     | Enable the MCP bridge (see below)                                        |
| `--bridge-no-auth`                           | off                     | Accept bridge connections without the token (dev only)                   |
| `-v`, `--version`                            |                         | Print the version and exit                                               |
| `-h`, `--help`                               |                         | Print help and exit                                                      |

Config file keys are the camelCase flag names: `port`, `host`,
`allowedHosts` (an array), `gateway`, `clickhouse`, `clickhouseDb`,
`clickhouseTable`, `clickhouseLogsTable`, `clickhouseUser`,
`clickhousePassword`, `clickhouseAllowRemote`, `ssoOrigin`,
`ssoClientId`, `ssoScope`, `open`, `bridge`, `bridgeNoAuth`.

### Allowed hosts

Every request must name the server, in its `Host` header, by an IP
address, `localhost` (or a `*.localhost` name), the `--host` value, or a
name passed with `--allowed-host`; anything else gets `403`. This stops
a DNS-rebinding page, which reaches the console under its own hostname,
from reading `/config.js`, querying ClickHouse or opening the bridge.
When the console sits behind a proxy or is reached by a DNS name, pass
that name: `--allowed-host console.example.com`.

### ClickHouse credentials on a LAN bind

The ClickHouse proxy adds `--clickhouse-user` / `--clickhouse-password`
to every query it forwards, and only refuses browsers on other origins;
a client that is not a browser is always let through. With a `--host`
other than a loopback address, anyone who can reach the port could
therefore run SQL as that user, so the server refuses to start with
credentials and a non-loopback `--host`. Pass `--clickhouse-allow-remote`
to accept this, for example on a trusted network.

### Shutdown

On `SIGINT` / `SIGTERM` the server stops accepting connections, ends
event streams (requests with `Accept: text/event-stream`, which the
browser reconnects) and waits up to 10 s for the other requests in
flight before it exits. A second signal exits at once.

## Routes

`main.go` builds one `http.ServeMux` behind the allowed-hosts check:

- `GET /healthz` → `ok`.
- `GET /config.js` → `window.__AEGIS_CONFIG__` generated from the flags
  (plus `window.__AEGIS_BRIDGE__` when the bridge is on). The SPA reads
  it at startup. It never carries the ClickHouse credentials, and a
  browser loading it for a page on any other origin (`Sec-Fetch-Site`
  other than `same-origin` or `none`) gets `403`.
- `/api/v2/clickhouse/*` → reverse proxy to `--clickhouse`, prefix
  stripped. The proxy adds `--clickhouse-user` / `--clickhouse-password`
  as `X-ClickHouse-User` / `X-ClickHouse-Key` and refuses requests from
  other origins the same way.
- `/api/`, `/v1/`, `/.well-known/`, `/authorize`, `/login`, `/token`,
  `/userinfo` → reverse proxy to `--gateway`; `503` when no gateway is
  set.
- Both proxies send the upstream's own host as `Host`, so a gateway
  behind a host-routed ingress receives requests it can route, and pass
  the console's host and scheme in `X-Forwarded-Host` /
  `X-Forwarded-Proto`.
- `/aegis-bridge/ws` → MCP bridge WebSocket, only with `--bridge`.
- Everything else → the embedded asset, or `index.html` for SPA routes.

## MCP bridge

The bridge lets an MCP client (an editor or agent) drive the console UI
open in a browser.

1. Start the server with `--bridge`. It generates a browser token and a
   control token, serves the WebSocket at `/aegis-bridge/ws`, and keeps
   a lock file at `~/.aegis/ide/<port>.lock` with the port, path,
   control token and connected sessions. `/config.js` hands the URL and
   the browser token to the SPA, which connects as a browser session.
2. Register `aegis-console mcp` as a stdio MCP server in your client.
   It picks the most recently active bridge from `~/.aegis/ide`,
   connects with the control token, and forwards each `tools/call`
   request to the browser session that is most recently active at the
   time of the call, so a reloaded or replaced tab keeps working.

The bridge has two tokens. The browser token reaches the SPA through
`/config.js` and only lets a browser session register; the control token
is written only to the lock file (mode 0600) and is required for a
control connection (`?as=mcp`), as `Authorization: Bearer <token>` or
`?token=`. A browser connects only from the console's own origin:
`/config.js` builds the bridge URL from the host the page was loaded
from.

A message on the bridge may be up to 16 MiB, enough for a full
`aegis_snapshot`. When a browser session closes, including when its
reply exceeds that limit, the calls waiting on it fail at once with the
error code `session_closed`.

`aegis-console mcp` flags:

| Flag              | Meaning                                                    |
| ----------------- | ---------------------------------------------------------- |
| `--lock <path>`   | Use this lock file instead of the newest in `~/.aegis/ide` |
| `--session <id>`  | Target this browser session instead of the most recent     |
| `--list-sessions` | Print the bridge's browser sessions and exit               |

The tool list served by `tools/list` is `mcp_tools.generated.json`,
embedded at build time. It is generated from
`packages/ui/src/agent/core/mcpToolCatalogue.ts`; regenerate it with
`pnpm gen:mcp-tools` (the library build does this too) and do not edit
it by hand. `pnpm check:mcp-tools` fails when the committed file is out
of date.

## How the build works

- `vite build` produces `apps/console/dist/`.
- `node server/bundle.mjs <target>` mirrors `dist/` into `server/dist/`
  (the embed staging directory, since `//go:embed` only sees files next
  to the package) and runs `go build` with the target's
  `GOOS`/`GOARCH`.

## Release

Push a tag matching `console-v*`:

```sh
git tag console-v0.1.0
git push origin console-v0.1.0
```

The `release-console` workflow builds all five targets, smoke-tests the
linux-x64 binary, and attaches the binaries plus `SHA256SUMS` to a
GitHub Release named after the tag.
