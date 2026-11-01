# Architecture and audit

## Initial audit

The original chat route referenced `../../../../lib/discovery` (one directory too high), producing HTTP 500 and a production compile failure. Intent inference widened a literal union to string, failing strict TypeScript. There were no automated tests or lockfile. Retrieval silently returned unrelated books when no terms matched. UI branch changes could relabel stale results; clipboard failures were not handled. Optional AI prose was not validated against catalog facts. Dependency audit on the installed Next.js 15.5.28 tree found PostCSS advisories; the application was upgraded to Next.js 16.4.3 with a committed lockfile.

## Request flow

1. `app/api/chat/route.ts` enforces an 8 KB streamed body limit, validates JSON, branch and string lengths, and provides the server-only AI binding.
2. `lib/engine/intent.ts` classifies English intent and identifies conversational refinements. `planning.ts` builds a bounded expanded query and explicit subject constraints.
3. `CatalogProvider.search` retrieves candidates. `providers/mock.ts` uses fixed fixtures; `providers/carlx.ts` fails closed until verified contracts exist.
4. `ranking.ts` deduplicates stable IDs and exact normalized title/author/year/format identities, filters constraints, and scores title, author, subjects and summary with deterministic ties. Different editions/formats remain distinct. ISBN-based work grouping is future work.
5. `availability.ts` calls the provider separately and adds explicit available/unavailable/unknown states. Missing holdings never mean zero copies. Branch choice scopes holdings, not relevance.
6. `response.ts` produces deterministic text or performs a server-only, eight-second bounded model request. Only valid catalog ID selections are accepted; model-generated prose is never rendered.
7. `discovery.ts` orchestrates stages and returns books, grounded text and a developer trace. `/api/catalog/search` uses the same pipeline with no AI.
8. `app/page.tsx` owns presentation, conversation and temporary lists. It does not import runtime provider code. Types live in `lib/types.ts`.

No database or persistent application service is needed. Configuration is server-side; no credentials appear in traces. API responses are uncached and application errors are generic. The app does not log query bodies or upstream responses.

## Validation

Node tests cover intent/context, expansion, constraints, deterministic order, deduplication, empty results, unavailable/unknown holdings, fail-closed CarlX behavior, AI grounding/fallback, request validation and the chat handler. Playwright covers production UI search, branch selection, refinements, inspector, temporary list actions, empty results and mobile overflow. Build checks strict TypeScript and server/client compilation.

## Deliberate limitations

Eight fixture titles cannot represent a library collection. English substring matching and a small synonym dictionary are explainable prototypes, not comprehensive recommendation or reading-level evaluation. Anaphora, complex negation, exclusion constraints and suitability judgements are not supported. The UI inspector is optional but trace data is present in the local API response. Lists are intentionally ephemeral. There is no login, rate limiter, production telemetry, authenticated inspector or patron workflow. Before any public service, separately design authentication, abuse controls, privacy/retention, accessibility evaluation and load testing. Do not expose this prototype publicly.

Live CARL•X and OpenAI calls are not verified. macOS/Windows instructions use portable npm scripts but validation was performed on Linux.

## Verified delivery

On Linux with Node 24.19.0 and npm 11.9.0: `npm ci`, all 11 Node pipeline/API tests, the Next.js 16.4.3 production build, strict typecheck, and all 3 Playwright tests passed. Browser tests used the installed `/usr/bin/chromium` because the environment policy blocked the Playwright CDN download. `npm audit` reported zero known vulnerabilities. No deployment, live AI request, CARL•X request or patron-account interaction was performed.
