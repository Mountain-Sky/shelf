# Shelf Discovery Lab

Shelf is a library discovery prototype: browse a sample collection, search and refine in natural language, compare editions, and maintain a temporary reading list.

## Run

Use the managed workflows:
- `artifacts/shelf: web` — React/Vite frontend at `/`.
- `artifacts/api-server: API Server` — Express API at `/api`; also starts the independent synthetic catalog simulator on loopback.

Do not run `pnpm dev` at the workspace root.

## Workspace

- `artifacts/shelf/src/app/` — original page and components, with original CSS in `src/index.css`.
- `artifacts/shelf/server.ts` — production frontend server.
- `artifacts/api-server/src/routes/shelf.ts` — Express adapter for the original API contracts.
- `lib/shelf-core/lib/` — original engine, session store, catalog providers, fixtures, model adapter, types, and public configuration.
- `lib/shelf-core/scripts/catalog-server.ts` — catalog simulator and stock-change CLI.
- `lib/api-spec/openapi.yaml` — API documentation; regenerate clients with `pnpm --filter @workspace/api-spec run codegen`.
- `.migration-backup/` — unchanged imported source retained for reference, excluded from publishing.

## Verification

- `pnpm --filter @workspace/shelf-core test` — engine, contracts, catalog sandbox, architecture, and reviewer gate tests.
- `pnpm --filter @workspace/shelf-core test:e2e` — browser flows against the running managed workflows through the shared proxy.
- `pnpm --filter @workspace/shelf run typecheck`
- `pnpm --filter @workspace/api-server run typecheck`
- Production frontend build requires workflow-provided `PORT` and `BASE_PATH`.

Browser tests use installed Chromium by default; override `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed. Generated screenshots/test output go under ignored `generated-artifacts/`.

## Product boundaries

All book records are demo fixtures and all branch counts are synthetic. No live LCPL/CARL•X connection, patron accounts, or holds exist. Typographic book covers are intentional. Reading lists and conversations remain browser-memory-only; server sessions expire after 30 minutes and are process-local. No database migration or durable history was introduced.

## Configuration

No AI credential is needed for deterministic search. The existing optional `OPENAI_API_KEY` / `OPENAI_MODEL` configuration remains server-only; live AI connectivity is not part of migration verification. Use Secrets for credentials.

- `CATALOG_MODE` defaults to `http-demo` when the API starts. `mock` uses embedded fixtures; `carlx` remains the original unconfigured adapter.
- `SHELF_INSPECTOR=1` opts into diagnostic responses; disabled by default.
- `SHELF_ACCESS=private` and `DEMO_ACCESS_PASSWORD` enable the existing Basic reviewer gate (username `reviewer`, password at least 16 characters). Private mode fails closed if unconfigured.
- `SHELF_PUBLIC_ORIGIN` optionally pins the accepted browser origin.
- `SHELF_CATALOG_STATE` optionally sets the simulator state file. Default when launched by the API workflow: `artifacts/api-server/.local/catalog.json`.

**Why a Node frontend server instead of static hosting:** the imported app supports a private reviewer gate on pages and assets as well as API routes. Both Vite development middleware and the production frontend server use the same gate; static publishing would bypass it.

Synthetic stock can be changed without restarting the app:

```sh
pnpm --filter @workspace/shelf-core catalog:set-stock --state ../../artifacts/api-server/.local/catalog.json --record demo-1 --branch RUST --copies 3
```

The state file is demo-only filesystem state, not a durable production database. Server restart expires discovery sessions.
