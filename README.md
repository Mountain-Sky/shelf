# Shelf Discovery Lab — LCPL prototype

An AI-native library discovery experiment, designed to run locally on macOS or Windows. **No production CarlX connection is included.** All book and branch availability data is synthetic prototype data.

## Run locally

Node.js 20.9+ recommended. From the extracted folder (the one containing `package.json`):

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.
Open http://127.0.0.1:3000. You don't need an AI API key to use the deterministic demo pipeline. Optionally put `OPENAI_API_KEY` in `.env.local` to enable short natural-language explanations. Requests then send the patron's query and demo candidate metadata to OpenAI; don't test with patron PII.

## What works

- Modern book discovery UI and demo catalog search
- Branch selection for three sample branches (not a full LCPL branch directory)
- Follow-up query refinement and query expansion
- Deterministic relevance heuristic
- Discovery Engine inspector showing intent, query, candidate count, rankings, and timing
- Temporary client-side shortlist and copy reading list
- Optional OpenAI-generated explanation

## Architecture

- `app/page.tsx` — client-side interface and temporary session state
- `app/api/chat/route.ts` — orchestrates discovery and optional explanation
- `lib/discovery.ts` — intent, query planning, ranking and inspectable trace
- `lib/catalog.ts` — mock catalog / placeholder for official CarlX SOAP adapter
- `app/api/catalog/search/route.ts` — direct catalog search API

The long-term boundary is `searchCatalog(query, branch): Promise<Book[]>`. Do not add credentials to browser code. The adapter must use *verified* CarlX SOAP method names and XML schemas, map records to `Book`, and query item availability separately where appropriate. Do not set `CATALOG_MODE=carlx` until implemented; it deliberately errors in that mode rather than fabricating data.

## Security / deployment

Local demo only; not approved as a publicly accessible system. Before LCPL testing or deployment: replace toy retrieval/ranking, evaluate accessibility, pin and audit dependencies, add request limits and timeouts, apply SSO/security controls to administrator diagnostics, validate model claims against catalog facts, review privacy and data retention, and perform authorized load testing. Leave patron account actions and holds out of scope until authentication/authorization is designed.

## CarlX integration preparation

Bring a known-working **redacted** SOAP search request, response, and any holdings method documentation. Build the adapter on the work network. Avoid reverse engineering public interfaces if a supported API is available.
