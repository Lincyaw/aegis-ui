# aegis-console binary

Single-file binary that serves the SPA + reverse-proxies the gateway and
ClickHouse. Written in Go with `embed.FS`, so the executable is fully
static (no Go runtime needed on the target machine) and weighs ~12 MB.

## Build

Prereqs: Node, pnpm, Go ≥ 1.22.

```sh
# Host platform
pnpm -F @lincyaw/console bundle:host
./apps/console/bin/aegis-console --help

# Specific targets (cross-compiled, no toolchain needed)
pnpm -F @lincyaw/console bundle:linux-x64
pnpm -F @lincyaw/console bundle:linux-arm64
pnpm -F @lincyaw/console bundle:macos-x64
pnpm -F @lincyaw/console bundle:macos-arm64
pnpm -F @lincyaw/console bundle:windows-x64

# Everything
pnpm -F @lincyaw/console bundle:all
```

Output goes to `apps/console/bin/aegis-console-<platform>`. Each binary
is ~11–12 MB (Go runtime ~6 MB + embedded SPA ~6 MB).

## Run

```sh
# Local viewer only (anonymous trajectories app + bundled gallery)
./aegis-console --clickhouse http://127.0.0.1:8123

# With remote AegisLab gateway (unlocks portal/datasets/etc. after SSO)
./aegis-console \
  --gateway https://gw.example.com \
  --clickhouse http://127.0.0.1:8123 \
  --open

# Or via JSON config file
./aegis-console --config ./aegis.json
```

The binary listens on `127.0.0.1:3323` by default. Pass `--host 0.0.0.0`
for LAN access. `--help` lists every flag.

## How it works

- `vite build` produces `apps/console/dist/`.
- `node server/bundle.mjs` mirrors `dist/` into `server/dist/` (the embed
  staging directory, since `//go:embed` only sees siblings) then runs
  `go build` with the appropriate `GOOS`/`GOARCH`.
- `server/main.go` is the entry: `http.ServeMux` with three roles:
  - `GET /config.js` → dynamically generated `window.__AEGIS_CONFIG__`
    populated from CLI flags.
  - `/api/v2/clickhouse/*` → reverse-proxy to `--clickhouse`.
  - `/api/*`, `/v1/*`, SSO endpoints → reverse-proxy to `--gateway`
    (returns 503 if no gateway configured).
  - Everything else: serve embedded asset, fallback to `index.html` for
    SPA routes.

## Release

Push a tag matching `console-v*`:

```sh
git tag console-v0.1.0
git push origin console-v0.1.0
```

The `release-console` workflow builds all five targets in parallel,
smoke-tests the linux-x64 binary, and uploads everything (plus
`SHA256SUMS`) to a GitHub Release named after the tag.
