# Backend-declared environments

Lets each `AegisApp` say which deployments it has (prod / stage / dev / …).
The app supplies a loader for its environment manifest; the shell calls it
when the app becomes active and renders an environment switcher in the
header. The library never fetches anything itself and knows no backend
route — where the manifest comes from is the host's business.

## Manifest

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
    }
  ]
}
```

- `badge` ∈ `default | info | warning | danger`
- `default` must reference an existing `id`

## Frontend integration (per app)

```ts
import type { AegisApp } from '@lincyaw/aegis-ui';

export const myApp: AegisApp = {
  id: 'my-app',
  basePath: '/my-app',
  environments: {
    // Resolve the manifest, `null` when the backend declares none, or
    // reject: the header then reports the failure and offers a retry.
    load: (signal) => loadMyManifest(signal),
    // Reported while the backend declares none. Omit to report nothing.
    fallback: { id: 'prod', label: 'Production', baseUrl: 'https://api.my-app.example.com' },
    storageKey: 'aegis.env.my-app', // default
  },
  routes: [...],
};
```

The console's env demo loads the `/.well-known/aegis-environments.json`
convention with `apps/console/src/apps/env-demo/wellKnownEnvironments.ts`:
a 404 means "none", and any other failure — network, HTTP status, a
manifest that doesn't match the shape above — rejects with the reason.

Inside the app, react to the chosen env:

```ts
import { useCurrentEnvironment, ENVIRONMENT_CHANGED_EVENT } from '@lincyaw/aegis-ui';

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

## Loading and persistence

Each app's manifest loads once a session, the first time the app is
active; a failed load is retried from the header. The user's selection is
persisted in `localStorage[storageKey]` and survives page reloads.

## Multi-app patterns

| Scenario                                                   | What to do                                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Each app has its own envs                                  | Each app loads its own manifest. Switchers are per-app and independent.                               |
| Multiple apps share the same envs (one cluster, many apps) | Give the apps loaders that read the same manifest.                                                    |
| Same env id, different `baseUrl` per app                   | Natural — the switcher selects an env id, and each app uses its own manifest's `baseUrl` for that id. |

## What's intentionally not done

- **No global "switch all apps to stage"** — env choice is per-app on
  purpose, since different backends may not share env semantics.
- **No automatic API-client rebinding** — apps own their data layer; the
  shell only fires `ENVIRONMENT_CHANGED_EVENT`.

## Files

- `types.ts` — `AegisAppEnvironmentsConfig`, `EnvironmentDescriptor`, `EnvironmentManifest`, status union, event detail.
- `EnvironmentProvider.tsx` — provider mounted by `AegisShell` for the active app; calls `load`, holds the choice.
- `environmentContext.ts` — the context the provider fills.
- `useEnvironment.ts` — `useCurrentEnvironment()`, `useEnvironmentManifest()`.
- `index.ts` — public re-exports.
