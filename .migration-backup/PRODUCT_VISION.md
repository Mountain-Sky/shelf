# Shelf product vision

Status: agreed direction, with implementation limits called out below.

Shelf is a discovery experience for public-library patrons, initially LCPL. It should help someone who knows a title find it quickly, and someone who cannot name what they want discover an appealing next read. Natural language is one way to navigate the collection, alongside conventional search, filters, and direct manipulation of results.

## Experience principles

- Lead with a changing visual collection, not a transcript. Preserve the relationship between the patron's choices and what appears next.
- Support precise title/author/identifier searches without requiring an AI conversation.
- Explain recommendations with catalog evidence. Separate an inference about suitability from a bibliographic fact.
- Preserve patron agency: show active filters, explain empty results, allow preferences to be revised, and never silently relax strict constraints.
- Treat availability as a timestamped ILS observation. Do not imply that a displayed copy can be borrowed or held without the appropriate circulation rules.
- Protect intellectual freedom: do not build durable interest profiles or use requests to label patrons. Childhood-interest queries do not justify unsupported age-suitability claims.
- Make keyboard, screen-reader, touch, reduced-motion, and small-screen use first-class requirements.

## What makes Shelf different

The Discovery Engine maintains a structured understanding of a discovery task, deliberately retrieves catalog records, evaluates evidence, selects editions, and returns a presentation-ready discovery state. AI helps interpret and assess; it neither acts as the catalog nor controls unrestricted tools. The same engine supports browsing, comparison, natural-language refinements, and conventional search.

## Current implementation versus aspiration

Implemented: modular engine, provider-neutral records, grouped editions with separate holdings, bounded requests, short-lived server context, deterministic conventional search, optional structured model interpretation and evidence assessment, and a basic card UI with temporary lists.

The existing screen is a transition client, not the final visual-discovery design. Substring search, small fixtures, and exact metadata quotations do not constitute excellent readers' advisory. Mood, pacing, reading difficulty, and complex negation require better metadata and evaluated strategies. The engine reports limitations rather than manufacturing those properties.

## Environment and boundaries

The first working example runs outside the LCPL network, with Internet access available for optional services. No AI key is required for conventional discovery. CARL•X SOAP access and search are user-confirmed; implementing the repository adapter awaits sanitized examples, not proof that SOAP is feasible.

No public deployment, patron accounts, circulation transactions, holds, or persistent reading histories are part of this phase. Koha can demonstrate a real off-network catalog backend after engine contracts are stable; it does not define Shelf's domain model.

## Success measures

Use a library-reviewed set of scenarios to evaluate known-item success, constraint compliance, relevance of the top results, explanation support, clarification usefulness, and recovery from failures. Measure accessibility and perceived responsiveness with people, not only passing code tests. Record response latency and upstream work per request without persisting patron text. Define pilot quality thresholds with LCPL before claiming readiness for patrons.
