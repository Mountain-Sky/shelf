# Continue on the Windows work laptop

## First task for the local coding agent

Read README.md, DESIGN_SYSTEM.md, ARCHITECTURE.md, docs/carlx.md and VALIDATION.md. Preserve `/explore` as the primary frontend and `/classic` for saved lists and inspection. Install with the lockfile, run the mock walkthrough, and record actual Windows results. Do not install Koha or change the Next.js framework.

## SOAP integration sequence

1. Inspect the user's existing successful CARL•X SOAP client and authoritative WSDL/imported XSDs locally. Establish supported search/holdings operations, auth, SOAP version, namespaces, pagination, limits and branch/status meanings. Do not invent these details.
2. Write sanitized fixtures and mapping tests for known-title search, empty results, paging, multiple editions, missing metadata, holdings and faults. Keep workplace-private artifacts outside Git unless explicitly cleared for sharing.
3. Implement `CarlXProvider` (`lib/providers/carlx.ts`) with abort handling, finite deadlines/concurrency, bounded responses, correctly escaped input, TLS verification and an XML parser that rejects DTD/external entities. Map only documented data into `CatalogRecord` and `Holding`.
4. Replace the deliberate CARL•X error in `dependencies()` (`lib/application/discovery-service.ts`) with configuration validation and provider construction. Add only the real service's required environment variables to `.env.example` as blank placeholders. Never silently select mock mode on integration failure.
5. Set `CATALOG_MODE=carlx` locally. Verify a read-only known-title query and holdings against the existing client. Verify branch refinements and failure behavior. Use a search-first landing state if CARL•X has no browse operation.
6. Run `npm.cmd run check`, browser tests and the Windows walkthrough. Update VALIDATION.md with evidence. Commit to a feature branch. Do not merge, deploy, or access patron accounts.

No SOAP connectivity or availability mapping is claimed by the export. User-confirmed feasibility is the starting point; the work is integrating their actual contract. Cover and AI integrations stay off until explicitly configured for the work environment.
