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

- Search: browse, title, author, ISBN and basic keyword matching over title/author/abstract. Queries use encoded JSON filters, bounded pages and a stable record-ID sort. This is relational catalog retrieval, not Koha's full Zebra/Elasticsearch OPAC search.
- Bibliography: source IDs, title, author, ISBN, summary, series, unambiguous year/page count. No invented records, inferred subjects, guessed formats or inferred work/edition grouping. Only an explicit local bibliographic item-type map supplies format.
- Subjects are absent from these JSON responses. Genre filters and similarity have limited coverage until a MARC or indexed-search integration is added. Missing metadata is not an invitation to infer it with a model.
- Visibility: request `opac_suppressed=0` and independently reject responses without explicit unsuppressed evidence. Broader production OPAC policy is unimplemented.
- Availability: request only `_status`, not patron-bearing checkout/hold/recall embeds. Available items must have only the known `available` status; restrictions, bundles, holds, transfers, damage and other known blockers prevent availability claims. Unknown statuses or missing evidence remain unknown.
- Holdings counts require complete pagination for the record, consistent totals and unique item IDs. Fetch at most three pages of 100 items per record, with at most four records in flight. Incomplete or failed responses remain unknown, including a truncated response containing some available items. These are observations, not promises of borrowing or hold eligibility.
- No write/hold/checkout/patron API methods exist in the adapter. Synthetic test-item changes happen through separate sandbox administration, never through Shelf's discovery endpoint.

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
