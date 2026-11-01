# Discovery Engine

Status: foundation implemented. The engine is a controlled pipeline, not an unrestricted model agent.

## Inputs, outputs and state

The engine accepts a request message, optional branch/action, and server-owned `SessionState`. Dependencies supply a `CatalogProvider` and optional `Intelligence`. Output contains grouped editions, availability, grounded response text, notices/clarification, suggested actions, next state and an internal trace. The application controls which fields reach the browser.

Session state retains at most 20 search terms, a 500-character goal, structured constraints/preferences and a maximum of 12 displayed result references. “Second” means the second group in the last displayed snapshot, never the second raw catalog candidate. The snapshot includes the selected edition's page count; shorter-than comparisons use that value. Missing reference or length evidence prompts clarification and preserves prior context.

## Stages and current strategies

1. **Interpret and update context.** Deterministic rules handle common intent, branch mentions, format changes, strict availability, selected subject filters, exclusions, and page limits. A new search resets discovery preferences except the explicitly selected branch; recognized refinements update context. The optional model proposes validated intent and additional search terms, but cannot remove code-managed strict filters.
2. **Plan.** Known-item requests can use title or identifier queries; author syntax uses an author query; exploration uses expanded keywords and subject searches; availability and filter-only requests can browse. Query fields are matched against provider capabilities. Models cannot submit endpoints, SQL, SOAP or arbitrary tools.
3. **Retrieve.** Execute independent queries concurrently with a bounded worker count. Pool pages deterministically. Pagination uses remaining request slots and detects repeated cursors. Partial failures produce notices; total attempted retrieval failure is an error, not an empty successful catalog.
4. **Normalize and preserve identity.** Reject unusable records, pool repeated provider-qualified IDs, and retain separate source records. No invented metadata repairs.
5. **Evaluate relevance.** Apply strict supported constraints. Deterministic title/author/subject/summary matches produce evidence and stable ranking. Exact title and identifier matches receive priority. Optional AI assessments must identify retrieved records and quote complete supplied fields. Valid assessments add a small bounded preference; they do not insert records or bypass filters.
6. **Resolve holdings and group.** Fetch holdings in one bounded batch for the relevance shortlist. Missing/stale/failed observations are unknown. Group by supplied work identity, choose an eligible representative edition, and apply strict versus preferred availability. Preserve editions in each group. Exclude a referenced seed group when requesting alternatives.
7. **Compose and snapshot.** Produce catalog-supported explanatory text, limitations, and next actions. Commit the resulting order for subsequent references. Keep facts distinct from model suitability inferences.

Current explanations deliberately quote metadata rather than exposing free-form model prose. This is an intermediate grounding implementation. Future richer explanations must cite the evidence they use and be evaluated for unsupported suitability claims; do not claim that quoting a subject proves a book is suitable for a particular child.

## Bounded work

Initial constants are centralized and testable: four catalog search requests including pagination; two concurrent searches; 20 records per page; at most 60 normalized candidates; 30 records in one holdings batch; 12 display groups; two model calls; 500 output tokens per model call; 18,000 serialized input characters per model call. A model payload over budget falls back rather than sending an unbounded conversation.

Catalog and holdings calls have three-second deadlines; model calls have five-second deadlines. A timeout aborts the underlying call and bounds caller latency even if an adapter incorrectly ignores its signal. Adapters must honor cancellation to avoid background load. There are no automatic retries. Shared metadata caching and circuit breakers are future tuning decisions based on observed ILS behavior, not assumed infrastructure.

The engine does not claim exhaustive recall beyond the bounded candidate window. Independent retrieval can run concurrently; normalization and ranking depend on retrieval; holdings follow relevance selection; final availability-aware selection follows holdings. No speculative model call is necessary for a conventional exact search.

## Evidence and failure policy

- Missing metadata stays unknown. A record without a page count fails a strict page limit, with an explanatory notice.
- Strict constraints are not silently relaxed. A zero-result response suggests broadening; it does not return unrelated books.
- “Prefer” is a ranking preference. “Only” is a predicate. A holdings outage cannot make unknown records satisfy “only available.”
- AI failures and invalid structured outputs preserve deterministic search. Invented IDs and evidence quotes are rejected.
- Enrichment is not currently executed. The `MetadataEnricher` contract is a proposed extension for separately attributed metadata; it has no live implementation.
- Raw upstream errors and credential-bearing responses are not exposed.

## Diagnostics and evaluation

Internal diagnostics include proposed/actual queries, request outcomes, candidate IDs, pooling decisions, grouping basis, scores and evidence, holdings status, model stage/status and stage timings. The public/local inspector redacts request-derived query text. Model usage/cost reporting is pending actual adapter usage propagation; there are no invented token or price values.

Use deterministic fixtures for objective invariants, adapter contract tests for integration behavior, and a reviewed relevance dataset for recommendation quality. Retain ordinal-reference and filter-replacement cases in regression tests. Evaluate latency and upstream work separately from relevance.

## Known limits

The parser covers selected English constructions, not arbitrary conversation. Title-seed similarity, vague plot recollection, pacing, technical difficulty, and child suitability are not solved by the small synonym map. Models can propose helpful terms, but no external metadata or semantic index currently supplies missing evidence. Broad browsing and batch limits can omit otherwise eligible records. A vector index should be added only after a measured improvement over the same evaluation set and corpus.
