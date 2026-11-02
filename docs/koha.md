# Koha sandbox provider

Shelf's Next.js UI and discovery engine remain intact. `KohaProvider` implements the existing catalog interface through Koha's documented read APIs. The embedded fixtures and independent catalog simulator remain available for deterministic development.

This first adapter is **sandbox-only**. It must not be enabled against a live library or patron system. Staff catalog APIs do not automatically apply every public OPAC visibility rule; filtering suppressed bibliographic records is not a substitute for validating `OpacHiddenItems` and local access policy.

## Verified source contract

The implementation targets the official Koha source revision [`7d272018beee67e422a090697796921a03a6eb39`](https://github.com/Koha-Community/Koha/tree/7d272018beee67e422a090697796921a03a6eb39). See:

- `api/v1/swagger/paths/biblios.yaml` for search, item listing, pagination, and `_status` embedding.
- `api/v1/swagger/paths/oauth.yaml` and `Koha/REST/V1/OAuth.pm` for OAuth client credentials.
- `Koha/Biblio.pm` and `Koha/Biblioitem.pm` for JSON field mappings.
- `Koha/Item.pm::_status` for computed availability.
- `Koha/REST/Plugin/Pagination.pm` for item-list `X-Total-Count`. The pinned bibliographic-list controller omits that header; search uses bounded page-length continuation when no total is supplied.

The adapter calls only `POST /api/v1/oauth/token`, `GET /api/v1/biblios`, and `GET /api/v1/biblios/{id}/items`. Catalog reads require the `catalogue` permission, not superlibrarian access. The token grant requires the `RESTOAuth2ClientCredentials` system preference. The OAuth principal is an integration account for the isolated sandbox, not a patron login.

## Capabilities and limits

- Search: browse, title, author, ISBN and keyword candidate matching over title/author/abstract/MARC metadata plus parsed subject searches. Queries use encoded JSON filters, bounded pages and a stable record-ID sort. This is relational catalog retrieval, not Koha's full Zebra/Elasticsearch OPAC search.
- Bibliography: source IDs, title, author, ISBN, summary, series, unambiguous year/page count. No invented records, inferred subjects, guessed formats or inferred work/edition grouping. Only an explicit local bibliographic item-type map supplies format.
- Subjects and genres come from MARC21 650/651/655 headings, with explicit canonical aliases for verified mystery headings. Missing metadata is never inferred by a model.
- Visibility: request `opac_suppressed=0` and independently reject responses without explicit unsuppressed evidence. Broader production OPAC policy is unimplemented.
- Availability: request only `_status`, not patron-bearing checkout/hold/recall embeds. Available items must have only the known `available` status; restrictions, bundles, holds, transfers, damage and other known blockers prevent availability claims. Unknown statuses or missing evidence remain unknown.
- Holdings counts require complete pagination for the record, consistent totals and unique item IDs. Fetch at most three pages of 100 items per record, with at most four records in flight. Incomplete or failed responses remain unknown, including a truncated response containing some available items. These are observations, not promises of borrowing or hold eligibility.
- The catalog adapter remains read-only. A separate circulation adapter supports explicitly enabled synthetic sandbox patrons. Synthetic test-item changes happen through separate sandbox administration, never through Shelf's discovery endpoint.

## Server configuration

Supply these as server process environment variables or Replit deployment Secrets/settings. Never use `NEXT_PUBLIC_`, commit credentials, or place them in `next.config`.

| Variable                               | Meaning                                                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `CATALOG_MODE=koha`                    | Select the real sandbox provider                                                                                                 |
| `KOHA_SANDBOX_ONLY=1`                  | Explicit acknowledgement that this is an isolated test instance                                                                  |
| `KOHA_API_URL`                         | Trusted staff API base, ending in `/api/v1`                                                                                      |
| `KOHA_CLIENT_ID`, `KOHA_CLIENT_SECRET` | Dedicated catalogue-read OAuth credentials                                                                                       |
| `KOHA_BRANCH_MAP`                      | JSON object mapping Shelf branch IDs to verified Koha library codes                                                              |
| `KOHA_FORMAT_MAP`                      | Optional JSON object mapping verified bibliographic item-type codes to `print`, `large-print`, `audiobook`, `ebook` or `unknown` |

Example mappings **only if these codes were created and verified in your sandbox**:

```json
{ "ASH": "ASH", "RUST": "RUST", "PUR": "PUR" }
```

Do not map a real unrelated library to an LCPL branch label just to make counts appear. The current branch selector is a prototype for the three configured demonstration branches; a general provider-owned branch directory remains future work.

HTTPS is required except HTTP to literal `127.0.0.1` for local validation. Redirects are rejected, response bodies bounded, caller cancellation propagated, tokens kept server-side in memory, and upstream errors do not fall back to fabricated fixture results. Credentials and upstream response bodies are not written to the inspector.

With these values in the process environment, `npm run demo` / `npm run demo:start` / `npm run replit:start -- --port 5000` use Koha instead of starting the fixture HTTP service. The production build remains `npm run build`. A fixture `--reset` flag never resets Koha. Next.js loads `.env.local` for its own server, but the launcher decides which service to start from its process environment; set `CATALOG_MODE=koha` there explicitly.

## Live verification

Independently identify a seeded sandbox record and its item states in Koha, then set `KOHA_SMOKE_TITLE` and `KOHA_SMOKE_EXPECT_ID` and run:

```sh
npm run koha:smoke
```

The command performs real OAuth, bibliographic retrieval and holdings resolution. It fails if the expected record is absent or branch holdings are unknown. It prints only the selected bibliographic title/ID and aggregate branch observations. Run it again after changing a synthetic item through sandbox administration, and compare the branch counts. A protocol-fixture test is not proof of live connectivity.

`npm test` includes the HTTP contract tests. They verify query/auth transport, suppression, mappings, status semantics, pagination completeness, bounded responses and failures without claiming a live Koha instance.

## Hosting boundary

Koha is a separate Perl/database/search service, not a package inside the Next.js app. The local development sandbox is not a permanent hosted service. A Replit deployment needs an independently hosted, private HTTPS-accessible Koha sandbox and server-side credentials. Never publish KTD's staff interface with default development credentials. The live demo can continue using `http-demo` until that hosting is configured; no deployment migration or framework rewrite is necessary.

See [sandbox evaluation](koha-evaluation.md) for the official KTD setup sources and operational constraints.

## Validation completed on 2026-11-01

A real local Koha instance (version 26.0600045, pinned source above) was started with MariaDB, memcached, Apache/Plack and a bounded RabbitMQ configuration. It contains sample bibliographic data and synthetic items. This is not a mocked HTTP server.

Verified through Shelf's actual provider and production API:

- OAuth client-credentials authentication; the dedicated principal has only catalogue permission, password login disabled, and a patron-list request is denied (403).
- Title and multiword keyword search return seeded bibliographic record 439, _The Left Hand of Darkness_ (Le Guin, 1969), with catalog provenance.
- Initial observations: RUST one available item, ASH zero available (its item is not for loan), PUR zero available.
- Changing only synthetic RUST item 973 through Koha administration from `notforloan=0` to `1` changed Shelf's result from one available copy to zero. Restoring it to `0` returned Shelf's count to one. No Shelf fixture or response was edited to produce this transition.
- Live Chromium walkthrough: title search, branch change, source labeling, unavailable item display, and clarification when subjects are missing. No browser page errors. Anonymous Shelf access returns 401; authenticated discovery succeeds without a model key.
- 64 automated tests, seven fixture/private-access browser tests, strict TypeScript and production build pass.
- Koha OPAC and staff-login HTML/CSS return 200 locally; staff-account workflows beyond sandbox bootstrap were not comprehensively tested.

The repeatable setup assets are in [sandbox/koha](../sandbox/koha/README.md). Generated credentials, container data and public image downloads remain outside Git. The consolidated setup generator was validated for pinned sources, private file permissions, rendered Compose configuration and shell syntax. The existing sandbox passed live checks after incremental environment repairs; a complete cold boot using the final combined recipe has **not** been independently rerun. Linux x86-64 was exercised; macOS/Windows Koha setup is unverified.

This proves the initial Koha integration locally. It does not deploy Koha for Replit, verify the user's Replit production URL, establish production OPAC policies, enable subject-based discovery, or test CARL•X/live AI.


## MARC21 discovery and sandbox branch configuration

The adapter now requests `application/marc-in-json` for bounded candidate pages. The pinned Koha controller prefetches metadata for this representation; `metadata.metadata` filtering is therefore supported there (not on the plain JSON list). XML text matches retrieve candidates only: parsed MARC21 650/651/655 headings supply subject evidence. Authority IDs and vocabulary codes are ignored. The precise 655 heading “Detective and mystery stories” maps to the canonical `mystery` constraint while retaining the original heading. A title containing “mystery” alone does not establish genre.

Records join to normal JSON details using Koha's internal MARC21 999$c ID, never external control field 001 or array order. The second read rechecks bibliographic suppression. Pages remain bounded to 20 candidates; both HTTP calls share the engine's stage deadline. This is a pinned MARC21 sandbox contract, not an assumption about UNIMARC or every Koha installation.

Use the non-secret `NEXT_PUBLIC_SHELF_BRANCHES` JSON array of `{ "id": "CPL", "name": "Centerville" }` objects in ignored `.env.local` before building to override branch display labels at build time. Koha libraries are discovered at runtime for both UI and engine. Match any aliases in server-only `KOHA_BRANCH_MAP`; rebuild when display overrides change. Local validation uses existing CPL/Centerville, FPL/Fairview, and MPL/Midway sample holdings, alongside ASH/RUST/PUR synthetic branches. It does not rename or transfer existing items.

Try “I want a mystery to pick up tomorrow at Centerville”: record 123 has one currently available sample copy. Fairview has record 199 with one, and Midway has record 200 with two. Rust has no mystery copies in this sandbox. Future availability and reservations are not established by these current holdings. Genre coverage still depends on supplied catalog headings.

For another catalog adapter (including Carl), keep returning the same provider-neutral `subjects` and branch holdings contracts. MARC parsing and Koha query conventions stay inside this adapter.


## Local patron accounts and circulation

The UI and account route call an application service through the provider-neutral CirculationProvider contract. Koha authentication, holds and renewal requests live in lib/providers/koha-circulation.ts; a future CARL adapter must implement and validate the same contract. CARL connectivity has not been tested.

Enable only in the isolated local sandbox: KOHA_SANDBOX_ONLY=1, KOHA_CIRC_CLIENT_ID, KOHA_CIRC_CLIENT_SECRET, and comma-separated KOHA_TEST_PATRON_IDS. Keep these server-only and out of Git. The original catalogue reader is unchanged. A separate service principal has catalogue/hold management and the named circulation/password-validation permissions.

sandbox/koha/seed-circulation.pl creates a dedicated SHELF category, two synthetic readers, two labeled fixture records/items, category-specific rules, and one checked-out fixture. It takes a JSON password on stdin and outputs sensitive JSON; capture it directly to a mode-0600 file outside Git. Do not rerun on an existing setup: rerunning resets the synthetic passwords and issues another service key. It uses a transaction and refuses collisions with unrelated patrons.

Sign in through **Library account**, view loans and holds, renew a loan, or use **Request hold** on a book card and explicitly choose a pickup branch. Koha decides eligibility; Shelf does not override circulation rules. A requested hold is not a ready-for-pickup promise. Reading lists remain browser-local.

Sessions use random opaque HttpOnly SameSite=Strict cookies, expire after 30 minutes, and are stored only in server memory (a restart signs everyone out). Account writes require same-origin JSON. Resource ownership is verified before cancel/renew; only allowlisted synthetic patrons can authenticate. Passwords are never persisted by Shelf. This is a single-process local sandbox, not production identity management.

Live browser tests accept SHELF_KOHA_ACCOUNT_FIXTURE pointing to the private fixture JSON. The explicit mutating smoke command is npx tsx scripts/koha-circulation-smoke.ts with that same variable. It increments the dedicated fixture renewal count, places and cancels a fixture hold, verifies readback, and checks that the second reader cannot act on the first reader account. The fixture permits five renewals; repeated runs can legitimately hit Koha limits.

Koha branches are discovered from the live libraries endpoint. Configured branch labels override display names; other branches use Koha names and codes automatically. MARC enrichment includes subjects, summaries, language, page count, identifiers and additional contributors when present. Missing metadata remains unknown. KOHA_OPAC_URL optionally enables real catalog links; use an HTTPS origin or loopback HTTP origin. Metadata and holdings remain source-backed.
