# Catalog data model

Status: implemented TypeScript contracts in `lib/types.ts`; actual CARL•X field mappings remain unimplemented.

## Identity layers

| Entity                        | Meaning and identity                                   | Current handling                                                                                                        |
| ----------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Work                          | Intellectual work, potentially shared by many editions | Optional trusted `{source,id}` relationship; never guessed from title/author                                            |
| Edition/format representation | The manifestation described by a source record         | `CatalogRecord` carries format, year, language, extent and identifiers; a separate edition registry is not required yet |
| Bibliographic record          | An authoritative source's description                  | Provider-qualified `RecordRef {provider,id}`; retained even when grouped                                                |
| Item                          | Individual copy, when a source exposes it              | Optional `CatalogItem` contract; not necessary to fabricate item IDs for aggregate holdings                             |
| Holding                       | Time-sensitive availability for a record at a branch   | Separate `Holding` observation with status, count, source and observation time                                          |
| Discovery group               | Patron-facing cluster of related records               | `ResultBook` with stable group ID, selected record ID, all eligible editions, evidence and primary-edition availability |

A bibliographic record is not guaranteed to map one-to-one to a real-world edition across catalogs. Preserve source identity first. Future catalog mappings can add explicit edition relationships when supported; do not use an ISBN alone as a universal work key.

## Bibliographic fields

Records include title; contributors with roles; multiple identifiers with schemes; format; optional year, language, page count or duration; subjects; optional summary and series/volume; optional canonical link; source provenance; and optional work relationship. Unknown format is explicit. Missing page counts or summaries stay missing. A display placeholder is presentation text, not inserted catalog metadata.

Invalid required records are omitted with a diagnostic. Non-HTTP(S) links are omitted. Invalid page counts cannot satisfy a strict length criterion. Real provider adapters must perform schema-aware normalization and bounds checking before returning records. No MARC or SOAP field mappings are assumed by these contracts.

## Provenance

Every record and holding identifies its source and whether it is fixture or catalog data, plus an observation timestamp. The optional enrichment contract requires its own source attribution. It must not silently overwrite authoritative fields. Enrichment is currently only a proposed extension port; no third-party metadata is fetched.

Fixture identity relationships, extra editions, page counts, and holdings are explicitly test data. They do not assert that LCPL owns a record or that the fixture describes a specific published edition accurately.

## Grouping and selection

Repeated retrieval of the same provider-qualified ID pools one source record. Separate IDs survive, even with identical text. Records group only when they share an explicitly supplied work relationship; otherwise each remains its own group. Grouping is presentation, not record deletion. Future fuzzy work grouping needs reviewed evidence and reversible decisions before adoption.

Apply format, subject and extent constraints to records before selecting the holdings shortlist. Keep record-specific holdings in each retained edition. Select a representative edition according to constraints and availability preference. Default searches prefer print only as a stable presentation tie-breaker; that does not establish a universal preference for patrons. Explicit format requests override it.

A display group's headline holdings belong to `selectedRecordId`. Expanded edition details retain other editions' statuses. Never aggregate counts across formats and present the sum as availability of the selected edition.

## Availability semantics

`available`, `unavailable`, and `unknown` are distinct. Counts can be null. An available observation requires a positive count; missing, malformed or stale observations become unknown. This initial adapter contract uses counts; a real ILS that reports status without count will require a documented contract extension rather than inventing a count.

The initial freshness budget is 60 seconds. Branch configuration is centralized and the three current codes are prototype configuration, not a verified full LCPL directory. “Prefer available at Rust” promotes an available edition but retains relevant unavailable results. “Only available at Rust” requires a fresh positive observation at Rust. Unknown holdings fail that strict predicate.

These statuses do not imply circulation eligibility, lendability, ebook licensing, or permission to place a hold. Digital services may need separate providers and rights semantics. CARL•X statuses and library policy determine the eventual mappings.
