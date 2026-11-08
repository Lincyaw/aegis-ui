# @lincyaw/review-api

The contract of the review workbench (`apps/console/src/apps/review`): tasks, items, evidence graphs built from telemetry, and verdicts.

- `main.tsp` is the source of truth. `pnpm -F @lincyaw/review-api build` emits `generated/openapi.yaml` and `src/openapi.gen.ts`; never edit either by hand.
- Any server implementing `generated/openapi.yaml` can back the workbench.
- A folder of JSON files is a complete read-only implementation: `GET /api/review/<path>` is served by `<root>/<path>.json`.
- `python/` holds the reference server (serves such a folder and saves verdicts) and the exporter that builds a folder from OpenRCA-style datapacks.
