# Open questions and decision register

## Locked decisions

- Visual discovery is primary; conversation supports navigating the collection.
- Off-network means outside LCPL, with Internet access available.
- AI is bounded intelligence inside a code-controlled Discovery Engine.
- Modular monolith; no microservices or vector database now.
- UI/API consumers do not talk directly to catalog adapters or model clients.
- CARL•X SOAP access and search are user-confirmed. Connectivity feasibility is not an open research task.
- Establish engine architecture before a new UI. A private Koha example is desirable later, not a prerequisite.
- Temporary discovery context and reading lists only; no patron accounts or circulation transactions.

## Evidence needed for later milestones

| Question                                                                       | Evidence/owner                                                               | Current default and impact                                                                                    |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| What CARL•X requests and fields are actually available?                        | User's sanitized working SOAP examples; library/vendor definitions as needed | Adapter fails closed until mapped. Do not ask for credentials in chat.                                        |
| How are branches, statuses and circulation restrictions encoded?               | LCPL integration owner                                                       | Three centrally configured demo branches; generic statuses are not production mappings.                       |
| Does the API provide status without counts, work relationships or item detail? | Representative CARL•X responses                                              | Preserve source records; aggregate counts supported now; extend contracts with evidence rather than guessing. |
| Which metadata supports reading level, pacing, page counts and mood?           | Catalog samples and licensed enrichment review                               | Missing evidence is unknown; no unsupported strict matches or suitability claims.                             |
| Which work groupings are trustworthy?                                          | Provider identifiers and reviewed bibliographic examples                     | Group only by supplied relationships; no fuzzy title/author merge.                                            |
| What makes a recommendation good for LCPL readers?                             | Librarians and patron research                                               | Use scenario corpus before optimizing ranking or adding semantic retrieval.                                   |
| Where should the private Koha sandbox run?                                     | Development host capabilities and setup trial                                | Defer provisioning until foundation is accepted; do not use a public demo as a dependable backend.            |
| Which AI services/models are approved, and at what budget?                     | LCPL privacy/security/operations review plus evaluation                      | Optional server-only OpenAI adapter, deterministic fallback; no live model call verified in this change.      |
| How should authoritative enrichment be sourced and licensed?                   | LCPL content rights and data-quality review                                  | Interface only; no enrichment fetches or silent metadata replacement.                                         |
| How should digital services appear beside physical holdings?                   | LCPL digital platform contracts and licensing semantics                      | No invented electronic availability or entitlement.                                                           |
| What are acceptable Windows hosting and session-store arrangements?            | Approved deployment topology                                                 | Single local process; temporary state expires on restart. Multi-worker hosting is not yet supported.          |
| What freshness, cache and load budgets fit CARL•X?                             | Observed service limits and operations agreement                             | Conservative bounded calls, no automatic retry, 60-second holdings freshness. Tune before pilot.              |
| How should rich explanations be evaluated?                                     | Evidence-grounding tests and librarian review                                | Compose deterministic metadata-supported text; defer free-form claims.                                        |

## Risks to track

A passing regression suite proves behavior, not library recommendation quality. The parser and small catalog remain demonstrations. Bounded candidate retrieval can miss eligible works. Provider field coverage may be incomplete. An AI quotation can be factual yet irrelevant to a patron's need, so relevance must be evaluated separately from grounding. API Origin checks and local binding are not a production authorization design. Automated mobile checks do not replace manual accessibility testing.

None of these open questions blocks documenting or testing the provider-neutral engine. They do block specific later claims and integration/pilot milestones.
