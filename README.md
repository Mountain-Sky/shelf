# Shelf Discovery Lab

A local library discovery application for the Loudoun County Public Library prototype. Search by title, subject or mood; refine your question; inspect deterministic rankings; and save a temporary reading list.

**All records are demo fixtures and all branch counts are synthetic. No live LCPL catalog, CARL•X connection, patron accounts or holds are implemented.** Book cover panels are typographic placeholders, not official cover art.

## Local setup (macOS, Windows or Linux)

Install Node.js 22 LTS or newer (minimum 20.9), then open a terminal in this repository:

```sh
npm ci
npm run dev
```

Visit http://127.0.0.1:3000. No configuration or API key is needed. Scripts bind to loopback, not the public network. Stop with Ctrl+C.

Optional configuration: on macOS/Linux run `cp .env.example .env.local`; on Windows PowerShell run `Copy-Item .env.example .env.local`. Keep `CATALOG_MODE=mock`. Never commit `.env.local` or prefix a secret with `NEXT_PUBLIC_`.

## Checks and production mode

```sh
npm test
npm run build
npm run typecheck
npm run start
```

Build before starting production mode; stop the development server first to free port 3000. `npm run test:e2e` runs Chromium interaction checks against a production server on port 3100, after `npm run build`. In restricted environments, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can point to an installed Chromium executable. Otherwise, first install the test browser with `npx playwright install chromium` (Linux may additionally require browser system libraries).

The committed npm lockfile makes installs reproducible. `npm audit` checks known dependency advisories; a clean result does not establish complete application security. Do not run dev and production builds concurrently in the same checkout because they share `.next`.

## Using Shelf

- Search for “Project Hail Mary”, “gentle science fiction”, or “adventure for kids”. Unmatched queries produce an honest empty result.
- Follow-up prompts combine with the previous query. “Only mysteries” and children requests apply explicit fixture subject filters. This is a small English heuristic system, not semantic search or age-suitability advice.
- Changing the branch reruns the current query. Availability is resolved separately: unavailable books remain discoverable. Zero copies and unknown availability are distinct.
- Save/remove titles and copy or clear your reading list. Lists and conversations are in browser memory only and disappear on reload.
- Open Discovery Engine for the plan, retrieved candidates, deduplication/ranking results, model status and stage timings. This optional view is for the local developer; it is not an authenticated administration system.

## Optional AI

Put `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `.env.local`, then restart. The default model is `gpt-4.1-mini`. The server sends only the current combined query and candidate IDs, titles, subjects and summaries to OpenAI with `store:false`. Do not enter patron personal information. Provider retention policies still apply.

AI can select up to three existing candidate IDs. Its structured output is validated against retrieved records; all prose is composed by the server from catalog facts. It cannot create new bibliographic records or availability claims. Errors, timeouts or invalid selections fall back to deterministic text. No key means no model requests. Live model connectivity requires your own key and has not been verified here; mocked success/error responses are tested.

## Documentation

- [Architecture and audit](docs/architecture.md)
- [CARL•X integration requirements](docs/carlx.md)

This is a local prototype. Public deployment, patron accounts and live holds are out of scope.
