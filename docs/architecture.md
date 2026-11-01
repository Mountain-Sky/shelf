# Architecture documentation

The current architecture review is maintained at the repository root:

- [Product vision](../PRODUCT_VISION.md)
- [Architecture and code assessment](../ARCHITECTURE.md)
- [Discovery Engine](../DISCOVERY_ENGINE.md)
- [Catalog data model](../CATALOG_DATA_MODEL.md)
- [UX strategy](../UX_STRATEGY.md)
- [Roadmap](../ROADMAP.md)
- [Open questions](../OPEN_QUESTIONS.md)

The first engineering pass repaired an incorrect chat-route import, a strict TypeScript intent error, unrelated fallback results, and missing test/lockfile coverage. It upgraded Next.js to address audited dependency advisories. The architecture foundation replaces that pass's mixed record/holdings model, lossy deduplication and concatenated query context; the root documents distinguish current implementation from future work.
