# @lincyaw/console

The AegisLab console: a private Vite + React app that mounts
`<AegisShell>` from `@lincyaw/aegis-ui` and registers every AegisLab
sub-app, including the component gallery that serves as the live spec
for the library. It is not published to npm.

## Sub-apps

Sub-apps live in `src/apps/<name>/` and are registered in
`src/registry.ts`. Each one exports an `AegisApp` (see the root
`CLAUDE.md` for the contract).

| Sub-app             | Base path                                              | What it is                                                            |
| ------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| `portal`            | `/portal`                                              | AegisLab: injections, executions, algorithms, benchmarks, datasets, … |
| `trajectories`      | `/trajectories`                                        | Read-only viewer for AgentM session trees stored in ClickHouse        |
| `llmharness-review` | `/cases`                                               | Browse llmharness case directories: trajectory, firings, verdicts     |
| `blob`              | `/blob`                                                | Object storage browser, uploader, and share-link manager              |
| `pages`             | `/pages`                                               | Static-site rendering of a markdown folder uploaded to blob storage   |
| `notes`             | `/notes`                                               | Knowledge-base reader with wikilink navigation                        |
| `settings`          | `/settings`                                            | Account preferences, workspace administration, endpoint configuration |
| `gallery`           | `/gallery`                                             | Live specimen of every primitive shipped by `@lincyaw/aegis-ui`       |
| `containers`        | `/containers`                                          | Demo: toolbar header + sidebar layout pattern (dev builds only)       |
| `datasets`          | `/datasets`                                            | Demo: tabs-in-header layout pattern (dev builds only)                 |
| `env-demo`          | `/env-demo/alpha`, `/env-demo/bravo`, `/env-demo/none` | Demo: environment switcher (dev builds only)                          |

Outside the sub-apps, `src/App.tsx` mounts the landing page (`/`), the
inbox (`/inbox`), the auth pages (`/auth/*`) and the error pages.

## Develop

From the repo root:

```bash
pnpm install
pnpm dev        # builds packages/ui, then starts the console dev server
```

The dev server listens on `https://localhost:3323` with a self-signed
certificate. The console imports the library from `packages/ui/dist`,
so after changing `packages/ui` run `pnpm -F @lincyaw/aegis-ui build`
(or restart `pnpm dev`).

Other scripts, run with `pnpm -F @lincyaw/console <script>`:

| Script                   | Does                                                     |
| ------------------------ | -------------------------------------------------------- |
| `build`                  | Production build into `dist/`                            |
| `preview`                | Serve `dist/` locally                                    |
| `type-check`, `lint`     | TypeScript and ESLint (`.eslintrc.cjs` in this folder)   |
| `format`, `format:check` | Prettier over `src/` (`.prettierrc.cjs` in this folder)  |
| `bundle:<target>`        | Build the single-file Go binary (see `server/README.md`) |

### Dev server settings

Set these in the environment or in `apps/console/.env.local`.

| Variable                 | Default                 | Effect                                                                                        |
| ------------------------ | ----------------------- | --------------------------------------------------------------------------------------------- |
| `VITE_HTTPS`             | on                      | Set to `0` to serve plain HTTP                                                                |
| `VITE_PORT`              | `3323`                  | Dev server port (strict: fails if taken)                                                      |
| `VITE_API_TARGET`        | `http://127.0.0.1:8082` | Proxy target for `/api`, `/v1`, `/.well-known`, `/authorize`, `/login`, `/token`, `/userinfo` |
| `VITE_CLICKHOUSE_TARGET` | `http://127.0.0.1:8123` | Proxy target for `/api/v2/clickhouse/*` (prefix stripped)                                     |

### Build-time variables

These are inlined into the bundle.

| Variable                      | Default                      | Effect                                      |
| ----------------------------- | ---------------------------- | ------------------------------------------- |
| `VITE_AGENTM_GATEWAY_URL`     | `ws://127.0.0.1:7777/agentm` | AgentM gateway WebSocket for the AI dock    |
| `VITE_AGENTM_TOKEN`           | unset                        | Token sent to the AgentM gateway            |
| `VITE_LLMHARNESS_DEFAULT_URL` | unset                        | Default case source for the Case Review app |

### Runtime endpoints

Endpoints that differ per deployment are read at runtime by
`src/config/runtime.ts`, in this order (later wins):

1. Built-in defaults: empty URLs, meaning same-origin.
2. `window.__AEGIS_CONFIG__`, set by `/config.js` (`public/config.js`
   in the image; generated from CLI flags by the Go binary).
3. A per-browser override saved from **Settings → Endpoints**
   (`/settings/endpoints`) in `localStorage`.

The keys are `gatewayUrl`, `ssoOrigin`, `ssoClientId`, `ssoScope`,
`clickhouseUrl`, `clickhouseDatabase`, `clickhouseTracesTable`,
`clickhouseLogsTable`, `clickhouseUser`, `clickhousePassword`,
`aiBaseUrl` and `aiModel`. The AI API key (`aiApiKey`) is accepted only
from the `localStorage` override.

## Deploy

There are two ways to ship the console.

### nginx image (Kubernetes)

The root `Dockerfile` builds the library and the console from the repo
root and serves `dist/` with nginx. `nginx.conf` is installed as a
template: it falls back to `index.html` for client-side routes and
proxies `/api` to the `API_TARGET` environment variable.

`scripts/deploy-frontend.sh <topic-slug>` runs `pnpm check`, builds
and pushes the image for `linux/amd64` to `docker.io/opspai`, and runs
`kubectl set image` + `rollout status` on the `rcabench-frontend`
deployment. The Helm chart in `helm/` deploys the image and sets
`API_TARGET` from `apiTarget` in `values.yaml`.

### Single binary

`server/` contains a Go program that embeds `dist/` and reverse-proxies
the gateway and ClickHouse, producing one static executable per
platform. See [`server/README.md`](server/README.md) for building,
running and releasing it.
