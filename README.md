# Shelf — Windows CARL•X work prototype

The **Visual bookshelf** is the default experience at `/explore`, with the original interface retained at `/classic` for reading-list management and optional developer inspection. Both share the teal/rust design, Arial typography and rounded discovery composer.

This package runs locally with an offline mock catalog. **CARL•X is not connected yet.** The SOAP provider is an explicit stub; selecting it returns an error rather than silently displaying mock results. No Koha installation, Docker, WSL, Python, hosting service or AI key is required.

## Windows setup (PowerShell)

1. Install an organization-approved Node.js **22 or 24 LTS** runtime (includes npm).
2. Extract the ZIP to a normal writable folder, for example `C:\Users\you\source\shelf-work-prototype`. Do not run inside the ZIP. Avoid a network/synced folder for node_modules if possible.
3. Open PowerShell in that extracted folder:

```powershell
node --version
npm.cmd --version
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Use `npm.cmd` in PowerShell to avoid execution-policy problems with npm.ps1; no policy change is needed. Copy `.env.example` only on first setup; do not overwrite an existing local configuration.

Open **http://127.0.0.1:3000** in a browser on that laptop. It redirects to the Visual bookshelf. Keep the terminal running. Stop with **Ctrl+C**. Restart with `npm.cmd run dev`.

The dependency installation needs npm registry access or your organization's configured registry. Once installed, mock discovery requires no catalog connection. If port 3000 is occupied, use `npm.cmd run dev -- --port 3001` and open that port.

## First walkthrough

- Search **Find The Hobbit**.
- Select **Ashburn** in the branch menu.
- Open the title, inspect its availability, save it and add it to comparison.
- Follow **My shelf** to the original interface; use its My shelf button to manage the browser-local list.
- Try an impossible title and confirm there are no substituted results.

All initial holdings are synthetic fixtures, not LCPL observations. Saved lists contain bibliographic labels only and are stored in this browser on this device. They do not persist availability. Discovery sessions expire and are lost on server restart.

## Build and verification

```powershell
npm.cmd run check
npm.cmd start
```

`check` runs unit/contract tests, production build and TypeScript validation. `start` requires a successful build. Stop the development server first if it uses the same port.

Optional Chromium browser tests (browser download required):

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Build first with the default mock branches and cover setting. Browser tests use port 3105 and isolated mock configuration, without AI calls. See [VALIDATION.md](VALIDATION.md) for the actual checks performed and the Windows verification limit.

## Connect CARL•X at work

Begin with [docs/carlx.md](docs/carlx.md) and [docs/WORK-HANDOFF.md](docs/WORK-HANDOFF.md). Bring the working SOAP client or sanitized requests/responses, service definitions, branch codes and availability meanings. Keep credentials and private service artifacts on the work machine.

- Implement `lib/providers/carlx.ts` against `CatalogProvider` in `lib/types.ts`.
- Wire the verified adapter into `dependencies()` in `lib/application/discovery-service.ts`, replacing its intentional CARL•X configuration error.
- Test sanitized SOAP fixtures before read-only work-network calls.
- Then set `CATALOG_MODE=carlx` in `.env.local`, restart and verify a known title and holdings against the existing client.

This is an integration starting point, not a completed SOAP client. No endpoint, SOAP operation, namespace or authentication mechanism has been invented. Patron login, holds and renewals are excluded.

## Optional integrations

- **Cover art:** defaults off. Set `NEXT_PUBLIC_SHELF_COVERS=openlibrary` before building (or restart dev) to request ISBN-matched art directly from Open Library. This sends ISBNs and the browser's network address to that service. Missing artwork remains a labeled placeholder.
- **AI:** defaults off. The engine works deterministically. Only configure `OPENAI_API_KEY` locally if permitted for workplace use; discovery text and candidate metadata may be sent to the model. Never prefix secrets with `NEXT_PUBLIC_`.
- **Inspector:** set `SHELF_INSPECTOR=1`, restart and open `/classic` → Show Discovery Engine. Request text is omitted from browser traces; diagnostics remain local.
- **Branches:** adapt the provider's optional `branches()` method and the documented public branch configuration. Default fixture branches are Ashburn, Rust and Purcellville. Never put secrets in public configuration.

This package binds to loopback by default. It is for local testing and does not publish your workplace service. The process environment overrides `.env.local`; check for old `CATALOG_MODE` settings if the wrong configuration appears. Do not disable TLS verification to work around corporate certificates; configure the approved trust chain.

## Package provenance

Frontend source: `Mountain-Sky/shelf`, `feat/visual-bookshelf-review`, commit `04af21087ac4bc286b5f891eeb31e0e597bba5e5`. See [EXPORT-MANIFEST.json](EXPORT-MANIFEST.json) for the exact exported commit, file list and checksums.

Included: Next.js UI/API, discovery engine, provider contracts, fixture catalog, CARL•X scaffold, optional server-side AI adapter, tests and documentation. Excluded: Koha providers/runtime/database, patron operations, MCP/OAuth connectors, Replit/Docker/hosting configuration, local secrets, logs, caches, node_modules and build output. The original project and Mac sandbox remain separate.
