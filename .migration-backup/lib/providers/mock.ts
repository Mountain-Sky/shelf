import type { CatalogProvider } from "../types";
import { recordKey } from "../types";
import { catalogRecords, fixtureHoldings } from "./fixtures";
export const mockProvider: CatalogProvider = {
  id: "demo",
  kind: "fixture",
  capabilities: {
    fields: ["keyword", "title", "author", "identifier", "subject", "browse"],
  },
  async search(query, signal) {
    signal.throwIfAborted();
    const text = query.text.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    const records = catalogRecords.filter((r) => {
      if (query.field === "browse") return true;
      if (query.field === "identifier")
        return r.identifiers.some((i) => i.value.replace(/[- ]/g, "") === text);
      if (query.field === "title") return r.title.toLowerCase().includes(text);
      if (query.field === "author")
        return r.contributors.some((c) => c.name.toLowerCase().includes(text));
      if (query.field === "subject")
        return r.subjects.some((s) => s.toLowerCase() === text);
      const haystack = [
        r.title,
        ...r.contributors.map((c) => c.name),
        ...r.subjects,
        r.summary ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return words.some((w) => haystack.includes(w));
    });
    const offset = Number(query.cursor ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw Error("Invalid fixture cursor");
    const limit = Math.max(1, Math.min(query.limit, 20));
    return {
      records: structuredClone(records.slice(offset, offset + limit)),
      ...(offset + limit < records.length
        ? { nextCursor: String(offset + limit) }
        : {}),
    };
  },
  async holdings(refs, branches, signal) {
    signal.throwIfAborted();
    const keys = new Set(refs.map(recordKey));
    const now = new Date().toISOString();
    return fixtureHoldings
      .filter(
        (h) => keys.has(recordKey(h.record)) && branches.includes(h.branch),
      )
      .map((h) => ({
        ...structuredClone(h),
        observedAt: now,
        provenance: { ...h.provenance, observedAt: now },
      }));
  },
};
