# CARL•X SOAP adapter handoff

The `CatalogProvider` interface has separate `search(plan)` and `availability(books, branch)` methods. `CarlXProvider` intentionally throws and performs no network calls. No SOAP operation names, envelopes, namespaces, authentication mechanism or endpoints are assumed.

Obtain the following from the library's authorized CARL•X/vendor contact before implementation:

1. Exact CARL•X product/version, supported integration API/version, sandbox endpoint and approved network/VPN route. Confirm development access and permitted use.
2. Authoritative WSDL plus every imported WSDL/XSD, version dates, service/port/binding, SOAP version, required HTTP headers and SOAPAction rules. Supply actual supported search and item/holdings operations, request fields, namespaces and element ordering.
3. One working **redacted** request/response for each search and holdings operation, plus empty results, pagination, multiple editions, missing metadata, unavailable items and SOAP faults. Provide XML schema validation expectations and encoding rules.
4. Authentication contract (for example whether headers, certificates or a session are required), credential provisioning/rotation, TLS trust requirements and sandbox access. Supply secrets securely outside Git; never in chat or sample fixtures.
5. Query grammar: title/author/subject/identifier indexes, phrase matching, escaping, filters, sort order, pagination tokens/limits, result totals and supported character sets. Clarify what query expansion is permitted.
6. Field mapping: stable bibliographic/record identifiers, ISBNs, title/subtitle, contributors, edition, publication year, material format, subjects, summaries, canonical catalog links and sanctioned cover sources. Define which fields may be absent; never synthesize missing records.
7. Holdings mapping: bibliographic-to-item identifiers; complete branch/location code dictionary; item statuses and their meanings; counts; circulation/restriction rules; timezone/timestamps and freshness guarantees. Distinguish checked out, in transit, noncirculating, suppressed, zero items, unknown and temporary service failures. Do not imply an item can be held or borrowed solely from a count.
8. Operational limits: request timeout, concurrency, quotas, retry/backoff policy, maintenance windows, SOAP fault codes, correlation IDs and vendor escalation contact. Agree on caching and data retention rules.
9. Approved contract-test fixtures and expected mappings, a read-only sandbox validation plan, and library/vendor acceptance criteria. No patron identifiers or account methods are needed for discovery.

Implementation should use a vetted XML parser with DTD/external entity resolution disabled, escaped text values, TLS verification, explicit timeouts and bounded responses. Translate only documented SOAP fields into internal types. Preserve provenance and unknown states. Test against redacted fixtures before any authorized sandbox request. Do not enable `CATALOG_MODE=carlx` until both search and availability contracts are implemented and validated. Account access, holds and production patron traffic remain out of scope.
