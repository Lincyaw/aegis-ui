# Backend-declared environment discovery

Lets each `AegisApp` self-declare which deployments it has (prod / stage /
dev / …) by serving a small manifest at a well-known URL. The shell reads
the manifest and renders an environment switcher in the header. If a
backend doesn't serve the manifest, the switcher silently stays hidden —
behavior is identical to a single-environment install.

## Contract

Each backend exposes:

```
GET <apiBaseUrl>/.well-known/aegis-environments.json
```

```json
{
  "default": "prod",
  "environments": [
    {
      "id": "prod",
      "label": "生产",
      "baseUrl": "https://api.example.com",
      "badge": "default"
    },
    {
      "id": "stage",
      "label": "预发",
      "baseUrl": "https://api-stage.example.com",
      "badge": "warning"
    },
    {
      "id": "dev",
      "label": "开发",
      "baseUrl": "https://api-dev.example.com",
      "badge": "info"
    }
  ]
}
```

- `badge` ∈ `default | info | warning | danger`
- `default` must reference an existing `id`
- 404 / network error / invalid schema → silently treated as "no manifest"

CORS: the manifest endpoint must allow the console's origin
(`Access-Control-Allow-Origin: *` is fine; allowlist is better in prod).

## Frontend integration (per app)

```ts
import type { AegisApp } from '@OperationsPAI/aegis-ui';

export const myApp: AegisApp = {
  id: 'my-app',
  basePath: '/my-app',
  apiBaseUrl: 'https://api.my-app.example.com', // seed; manifest may override per env
  environments: {
    discoveryPath: '/.well-known/aegis-environments.json', // default
    fallback: 'production',                                // default
    storageKey: 'aegis.env.my-app',                        // default
  },
  routes: [...],
};
```

Inside the app, react to the chosen env:

```ts
import { useCurrentEnvironment, ENVIRONMENT_CHANGED_EVENT } from '@OperationsPAI/aegis-ui';

function MyPage() {
  const env = useCurrentEnvironment(); // { id, label, baseUrl, badge } | null

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<EnvironmentChangedEventDetail>).detail;
      // re-bind your axios baseURL, clear caches, force re-auth, etc.
      void rebuildClient(detail.env.baseUrl);
    };
    window.addEventListener(ENVIRONMENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(ENVIRONMENT_CHANGED_EVENT, onChange);
  }, []);

  return <ApiClientProvider baseUrl={env?.baseUrl}>…</ApiClientProvider>;
}
```

The shell does **not** rewrite axios base URLs for you. It surfaces the
choice; each app decides how to consume it (typical: rebuild the API
client + clear in-flight requests + force re-auth on the new env).

## Backend integration (any stack)

Any backend can serve the manifest — it's a well-known endpoint, not an
AegisLab-specific protocol. Three options:

1. **Inline in your existing server** — add one route returning the JSON
   above. ~10 lines in any framework.
2. **Sidecar binary** — reuse
   `aegis/AegisLab/src/cmd/aegis-env-manifest-server` as a tiny standalone
   process, configured via the `AEGIS_ENVIRONMENTS_JSON` env var. No
   change to your main backend.
3. **Static host** — serve a static JSON file from a CDN / S3 / nginx and
   set the app's `environments.discoveryPath` to an absolute URL.

For AegisLab specifically, the handler is at
`src/platform/router/well_known.go` and is configured via the
`AEGIS_ENVIRONMENTS_JSON` env var or the `aegis.environments` toml block.
The helm chart exposes it as `aegisEnvironments.{enabled, manifest}` —
see `aegis/AegisLab/helm/<chart>/values-multi-env.example.yaml`.

## Caching

The manifest is fetched on app mount and cached in-memory for 5 minutes,
with `ETag` revalidation. The user's selection is persisted in
`localStorage[storageKey]` and survives page reloads. To force a refetch,
clear the storage key or call `clearManifestCache()` (exported from this
module for advanced use).

## Multi-app patterns

| Scenario                                                   | What to do                                                                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Each app has its own envs                                  | Each app ships its own manifest. Switchers are per-app and independent.                                         |
| Multiple apps share the same envs (one cluster, many apps) | Have all apps point `discoveryPath` at the same absolute URL, or have each backend serve an identical manifest. |
| Same env id, different `baseUrl` per app                   | Natural — the switcher selects an env id, and each app uses its own manifest's `baseUrl` for that id.           |

## What's intentionally not done

- **No global "switch all apps to stage"** — env choice is per-app on
  purpose, since different backends may not share env semantics. If a
  shell-wide selector is needed later, it can be layered on top.
- **No automatic API-client rebinding** — apps own their data layer; the
  shell only fires `ENVIRONMENT_CHANGED_EVENT`.
- **No transport for "secret" envs** — the manifest is anonymous and
  cacheable. Don't put auth-gated env URLs in it.

## Files

- `types.ts` — `AegisAppEnvironmentsConfig`, `EnvironmentDescriptor`, `EnvironmentManifest`, status union, event detail.
- `manifest.ts` — fetch + cache + ETag + schema validation.
- `EnvironmentContext.tsx` — provider mounted by `AegisShell` for the active app.
- `context.ts` — context object split out for fast-refresh.
- `hooks.ts` — `useCurrentEnvironment()`, `useEnvironmentManifest()`.
- `index.ts` — public re-exports.
