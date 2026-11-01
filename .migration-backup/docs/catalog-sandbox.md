# Independent demo catalog service

This is a private **synthetic catalog simulator**, not Koha, CARL•X, or a complete ILS. It proves Shelf can retrieve records and time-sensitive holdings from a separate process without a library network, credentials, or patron accounts.

The fixture catalog contains 32 familiar published titles and 44 source records including alternate formats. Titles and authors identify known books; summaries, subject assignments, edition/page-count metadata, grouping relationships, and all holdings are curated demonstration data. Do not interpret any copy count, edition detail or reading-suitability label as a verified LCPL fact. The original small fixtures remain compatible.

## Start the service

From the repository directory, in a separate terminal:

```sh
npx tsx scripts/catalog-server.ts serve
```

The server binds **only** to `127.0.0.1:4310`. Its state is stored in `.local/catalog.json`; keep `.local/` ignored by Git. Use `--port 4311` or `--state /path/to/test-stock.json` when needed. Normal startup creates state only if absent and never resets existing stock.

Configure Shelf in `.env.local`:

```dotenv
CATALOG_MODE=http-demo
DEMO_CATALOG_URL=http://127.0.0.1:4310
```

Restart Shelf after changing configuration. No API key is needed. `CATALOG_MODE=mock` retains the fast embedded fixtures with no separate service.

## Demonstrate a real backend change

Search Shelf for **Project Hail Mary** and select **Rust**. The print fixture initially has zero available copies; the separate audio fixture has one. In another terminal:

```sh
npx tsx scripts/catalog-server.ts set-stock --record demo-1 --branch RUST --copies 3
```

Search or refresh the branch selection again. The print record now reports three synthetic copies. This change is read through the HTTP provider, not through an application fixture edit. Stop and restart the catalog service: the count remains three.

Restore defaults explicitly:

```sh
npx tsx scripts/catalog-server.ts reset
```

Stock changes accept only existing fixture record IDs, configured branches, and integer counts from 0–99. These commands edit a local test-data file, not circulation records. They are intentionally not exposed as HTTP mutation endpoints. Run fixture-management commands sequentially; this demonstration file store is not a multi-writer database.

## Contract and behavior

- `GET /health` reports service and persisted-state readiness.
- `POST /search` accepts the normalized `CatalogQuery` contract and returns paginated records.
- `POST /holdings` accepts `{ records, branches }` and returns fresh synthetic holdings observations.
- No CORS, public hosting, patron authentication, holds, or SOAP endpoints are provided.
- Requests and responses are bounded. The adapter honors the engine's abort signal, allows only an HTTP `127.0.0.1` origin, and refuses redirects.
- Service failure never silently switches to embedded data. Search failures reach the engine; holdings failure becomes unknown availability through its normal policy.
- Malformed state fails closed. Use the explicit reset command only if you want to discard test stock changes.

Integration tests start the service on random loopback ports with temporary state files, exercise pagination, change stock, restart, verify persistence, reset, and test failure/validation behavior. They do not contact an external ILS.

## Path to Koha

A private Koha installation remains a useful later integration demonstration. It needs its supported API, authentication, seeded bibliographic/item data, and reproducible infrastructure. Replace the simulator with a Koha-specific adapter behind the same engine contract; do not make Koha's wire format the engine data model. This simulator does not establish Koha or CARL•X interoperability.
