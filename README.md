# Shelf Discovery Lab

A working visual library discovery demo for the Loudoun County Public Library prototype. Explore a bookshelf, search or refine in natural language, compare editions, and keep a temporary reading list. The full demo reads 32 works / 44 edition records through an independent local catalog service with persistent synthetic holdings.

**In the default catalog mode, all records are demo fixtures and all branch counts are synthetic. No live LCPL catalog, CARL•X connection, patron accounts or holds are implemented.** Book cover panels are typographic placeholders, not official cover art.

## Replit deployment

Import this repository from GitHub and follow [Private demo on Replit](docs/replit.md). The committed configuration uses a password-protected Reserved VM; no Cloudflare setup is needed. Synthetic holdings reset on each deployment startup.

## Local setup (macOS, Windows or Linux)

Install Node.js 24 LTS, then open a terminal in this repository:

```sh
npm ci
npm run demo
```

Visit http://127.0.0.1:3000. The command starts Shelf and its independent catalog simulator; no configuration or AI key is needed. Both bind to loopback. Stop with Ctrl+C. If port 3000 is occupied, use `npm run demo -- --port 3001`.

For the reviewer walkthrough and password-protected container package, see [Private demo](docs/private-demo.md). For the stock-change demonstration, see [Catalog sandbox](docs/catalog-sandbox.md). The simulator is not a full ILS; [Koha evaluation](docs/koha-evaluation.md) documents the separate integration path.

`npm run dev` remains available as a simpler embedded-fixture development mode. The recommended complete demo is `npm run demo`.

Optional configuration: on macOS/Linux run `cp .env.example .env.local`; on Windows PowerShell run `Copy-Item .env.example .env.local`. Keep `CATALOG_MODE=mock`. Never commit `.env.local` or prefix a secret with `NEXT_PUBLIC_`.

## Checks and production mode

```sh
npm test
npm run build
npm run typecheck
npm run demo:start
```

Build before starting production mode; stop the development demo first to free ports 3000 and 4310. `npm run test:e2e` runs Chromium interaction checks against production demos on ports 3100 and 3102, including protected access and independent catalog stock changes, after `npm run build`. In restricted environments, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can point to an installed Chromium executable. Otherwise, first install the test browser with `npx playwright install chromium` (Linux may additionally require browser system libraries).

The committed npm lockfile makes installs reproducible. `npm audit` checks known dependency advisories; a clean result does not establish complete application security. Do not run dev and production builds concurrently in the same checkout because they share `.next`.

## Using Shelf

- Search for “Project Hail Mary”, “gentle science fiction”, or “adventure for kids”. Unmatched queries produce an honest empty result.
- Follow-up prompts update structured session preferences. “Only mysteries” and children requests apply explicit fixture subject filters. This is a small English heuristic system, not semantic search or age-suitability advice.
- Changing the branch reruns the current query. Availability is resolved separately: unavailable books remain discoverable unless you request only available titles. Zero copies and unknown availability are distinct.
- Save/remove titles and copy or clear your reading list. Lists and the visible conversation are in browser memory only and disappear on reload; the engine uses a separate short-lived structured session described below.
- With local diagnostics enabled, open Discovery Engine for the plan structure, retrieved candidates, grouping/ranking results, model status and stage timings. This optional view is for the local developer; it is not an authenticated administration system.

## Optional Koha sandbox

An opt-in, read-only Koha REST provider is available without changing the Next.js architecture. See [Koha sandbox provider](docs/koha.md) for server-only OAuth configuration, source contracts, limited subject/genre coverage, and live validation. The default demo still uses fixtures; enabling this adapter does not provision or host Koha.

## Optional AI

Put `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `.env.local`, then restart. The default model is `gpt-4.1-mini`. The server sends the bounded current request/context and shortlisted candidate IDs, titles, contributors, subjects and summaries to OpenAI with `store:false`. Do not enter patron personal information. Provider retention policies still apply.

AI can propose bounded search terms and intent, then assess existing candidate records using exact supplied metadata as evidence. Its structured output is validated; it cannot relax strict filters. All displayed prose is composed by the server from catalog facts. It cannot create new bibliographic records or availability claims. Errors, timeouts or invalid selections fall back to deterministic text. No key means no model requests. Live model connectivity requires your own key and has not been verified here; mocked success/error responses are tested.

## Architecture foundation

Shelf uses a provider-independent Discovery Engine between the UI and every catalog/model integration. Read [ARCHITECTURE.md](ARCHITECTURE.md) first, then [DISCOVERY_ENGINE.md](DISCOVERY_ENGINE.md) and [CATALOG_DATA_MODEL.md](CATALOG_DATA_MODEL.md). The [roadmap](ROADMAP.md) separates implemented foundations from the later Koha example and visual redesign. CARL•X SOAP access/search are user-confirmed; this repository adapter awaits their sanitized mappings.

Server sessions retain structured preferences and the latest displayed result order for 30 minutes idle, in memory only. Refreshing starts a new browser session; restarting the server expires server context. “More like the second one, but shorter” uses the selected edition’s fixture page count; missing length evidence prompts clarification. Strict page, format and availability filters are never silently relaxed.

Set `SHELF_INSPECTOR=1` locally to enable diagnostic responses; restart the server after changing configuration. Browser diagnostics omit request text. No diagnostic trace is returned by default.

## Documentation

- [Architecture and audit](docs/architecture.md)
- [CARL•X integration requirements](docs/carlx.md)

This is a local prototype. Public deployment, patron accounts and live holds are out of scope.
