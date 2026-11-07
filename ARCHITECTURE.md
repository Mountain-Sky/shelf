# Work prototype architecture

Browser (`/explore`, secondary `/classic`) → Next.js API (`/api/chat`, `/api/catalog/search`) → application service → discovery engine → CatalogProvider → mock fixtures now / CARL•X SOAP after implementation.

The preferred UI and rounded composer come from source commit 04af210. The export preserves its shared brand and interactions, redirects `/` to `/explore`, moves the original UI to `/classic`, and removes account/hold operations. The browser's temporary reading list is shared between both routes.

## Boundaries

- `app/`: rendering, interaction and browser-local reading lists. Never imports catalog adapters or server credentials.
- `lib/application/discovery-service.ts`: provider selection, request validation, ephemeral sessions, optional intelligence, branch configuration and diagnostic response shaping.
- `lib/engine/`: intent, bounded planning/retrieval, deduplication/ranking, availability resolution and grounded response composition. Provider and transport independent.
- `lib/types.ts`: records, queries, holdings, capabilities and the `CatalogProvider` interface. Facts carry source provenance; unavailable metadata stays unknown.
- `lib/providers/mock.ts`, `fixtures.ts`: deterministic offline examples, clearly identified as demo data.
- `lib/providers/carlx.ts`: unimplemented SOAP boundary. It must be mapped to the user's actual working service definitions and wired into the application service. No SOAP calls occur in this package yet.
- `lib/ai/openai.ts`: optional server-only intelligence. No key means no model request; an AI model does not supply bibliographic records or availability.

Credentials belong in local environment configuration, never browser state. Cover art is an optional browser-to-Open-Library request, disabled by default. Patron account APIs and circulation implementations have been removed. Discovery sessions are memory-only; reading lists store titles/authors/IDs in localStorage, without holdings or patron data.

## CARL•X capability boundaries

Implement only verified search fields in `capabilities.fields`. The initial collection asks to browse; if the API cannot browse, add an explicit search-first empty state rather than inventing results. Similarity and subject filtering depend on actual returned subjects. Branch discovery can use `branches()` or a verified static configuration. Counts must represent known available copies; errors and incomplete holdings produce unknown availability, not fabricated zeros or available states.

No independently deployed gateway is required for this prototype: the Next.js server hosts the application and adapter layers. The work laptop must reach the SOAP service over the approved network/VPN. Tests enforce UI/application/engine/provider separation.
