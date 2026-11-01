# Roadmap and acceptance gates

## 1. Architecture and engine foundation — this change

Deliver the seven review documents, module-boundary tests, provider-neutral catalog contracts, bounded engine, preserved source identity, separate holdings, structured ephemeral sessions, explicit constraints and evidence-backed model ports. Keep the current UI operational. Replace the earlier unsafe deduplication behavior rather than preserving its test expectation.

Acceptance: build/typecheck, engine invariants, catalog contract tests, session/revision behavior, boundary tests and existing browser workflows pass. Label unsupported readers' advisory behavior explicitly. No live integration claims.

## 2. Retrieval quality and intelligence evaluation

Create an LCPL-reviewed scenario corpus covering exact titles, author/identifier searches, moods, children's interests, plot recollection, similarity, format changes, nonfiction switches, page limits and branch availability. Attach expected evidence, permissible ambiguity and hard constraints to each scenario.

Evaluate deterministic and bounded-model behavior against the same corpus. Implement seed-title lookup and strategy refinement where it demonstrably improves results. Propagate real model usage for latency/token/cost reports. Select permitted enrichment sources only after licensing, privacy and usefulness are understood. Do not install a vector database as a default response to poor keyword recall.

Acceptance: no hard-constraint violations or fabricated facts in the corpus; LCPL agrees relevance and clarification expectations. Establish numerical relevance and latency targets from baseline measurements, not arbitrary claims.

## Current demo progress

Implemented beyond the foundation: a 32-work / 44-record independent HTTP catalog simulator with persistent synthetic stock; verified-title seed similarity; explicit displayed-result selection; a bookshelf-first responsive UI with comparison, reading lists and filters; and a private Node-container package. The simulator is not Koha. Live AI, real ILS mappings, private hosting publication, and full accessibility/relevance acceptance remain unverified.

## 3. Full off-network catalog example

Retain fast fixture tests. Use a private Koha instance as the preferred integration proving ground if its setup is practical on the development host. Inspect the selected version's supported APIs and authentication before implementing a small adapter; do not assume routes from memory.

Load source-attributed sample bibliographic records and deliberately synthetic branches/items. Demonstrate that changing holdings in the test ILS changes Shelf's observations without modifying Shelf fixtures. Exercise pagination, missing fields, edition relationships, timeouts and faults through shared provider contracts.

Acceptance: documented reproducible setup, read-only Shelf integration, no live patrons, no dependency on a shared public demo, and no Koha-specific imports outside its adapter/composition. Koha is not required for milestones 1–2 and does not validate CARL•X SOAP compatibility.

## 4. Visual discovery experience

Use the agreed UX strategy and tested engine responses to design and implement the visual bookshelf, visible criteria, edition switching, comparisons, explicit selected-title actions, discovery trails, and useful clarification flows. Review desktop and mobile concepts before investing in a wholesale UI replacement.

Acceptance: representative patron task walkthroughs, keyboard and screen-reader checks, responsive layouts, error/empty/slow states, and regressions for reference consistency when cards reorder. Keep a direct conventional search path.

## 5. CARL•X mapping and authorized integration

Use the user's existing working SOAP search examples. Obtain representative sanitized responses and holdings/status semantics, map them to the established contracts, and test with fixtures before authorized network access. Confirm branch codes, paging and request budgets with LCPL. Do not build or reverse-engineer SOAP operations before inspecting those examples.

Acceptance: verified read-only search/holdings behavior and representative record mappings. Existing provider-independent engine tests continue to pass. No account, hold or circulation actions.

## 6. Approved Windows deployment/pilot preparation

Separately address multi-worker session storage, authentication for diagnostics, request throttling, model egress/privacy review, TLS/secrets, logging retention, load testing, accessibility evaluation and operational ownership. Define availability freshness/caching with actual ILS constraints. Public deployment and organizational approval are not part of the current change.

## Sequencing rule

Backend contracts and engine acceptance come first; UI implementation follows those contracts. A test ILS proves the adapter boundary, not the discovery product. Do not label future milestones as implemented merely because an interface exists. Do not merge without review.
