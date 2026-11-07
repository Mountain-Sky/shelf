# Export verification — November 7, 2026

Source UI: `04af21087ac4bc286b5f891eeb31e0e597bba5e5` (`feat/visual-bookshelf-review`). Export changes live on `feat/windows-carlx-export`; the ZIP manifest identifies the packaged commit.

## Verified in Linux cloud environment

- Node 24.19.0 / npm 11.9.0 dependency installation using the committed lockfile.
- 56 unit/contract tests: discovery pipeline, normalization, relevance, availability, sessions, API validation, architecture boundaries, reading-list parsing, ISBN validation and explicit rejection of unconfigured CARL•X mode.
- Next.js production build and strict TypeScript validation.
- Four Chromium browser tests: default redirect to `/explore`; title search; branch refinement; details; saving; comparison; reading-list restoration in `/classic`; empty results; account route absent; no external browser requests with default settings; 1280px, 390px and 320px layouts.
- Production dependency audit: no reported vulnerabilities at packaging time. This is an npm advisory check, not a full security audit.
- ZIP excludes local credentials, Koha runtime/database, node_modules, build output and Git history; per-file SHA-256 hashes are provided.

## Not yet verified

- Native Windows execution. Commands and test launchers are Windows-compatible, but this session has no Windows execution environment. Run the README walkthrough on the work laptop before marking Windows verified.
- CARL•X SOAP authentication, searches, pagination and availability. The adapter is intentionally unimplemented; selecting CARL•X fails clearly without mock fallback.
- Workplace VPN/firewall/certificates or package registry access.
- External AI and cover services: disabled for the default verification. No paid AI calls were made.

This is a runnable offline integration starting point. It is not a live CARL•X or patron-services demonstration.
