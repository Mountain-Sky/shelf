import type { CatalogRecord, CatalogProvider } from "../types";
import { recordKey } from "../types";
const formats = ["print", "large-print", "audiobook", "ebook", "unknown"];
/** Reject unusable records without making up required catalog fields. */
export function normalize(
  records: CatalogRecord[],
  provider: CatalogProvider,
): { records: CatalogRecord[]; notes: string[] } {
  const kept = new Map<string, CatalogRecord>();
  const notes: string[] = [];
  for (const r of records) {
    if (
      !r ||
      r.ref?.provider !== provider.id ||
      typeof r.ref.id !== "string" ||
      !r.ref.id ||
      typeof r.title !== "string" ||
      !r.title.trim() ||
      !Array.isArray(r.contributors) ||
      !r.contributors.every(
        (c) => typeof c?.name === "string" && typeof c.role === "string",
      ) ||
      !Array.isArray(r.subjects) ||
      !r.subjects.every((s) => typeof s === "string") ||
      !Array.isArray(r.identifiers) ||
      !r.identifiers.every(
        (i) => typeof i?.scheme === "string" && typeof i.value === "string",
      ) ||
      !formats.includes(r.format) ||
      typeof r.provenance?.source !== "string" ||
      !r.provenance.source ||
      (r.summary !== undefined && typeof r.summary !== "string") ||
      r.provenance.kind !== provider.kind
    ) {
      notes.push("An invalid provider record was omitted.");
      continue;
    }
    const key = recordKey(r.ref);
    if (kept.has(key)) {
      notes.push(`Duplicate source record ${key} was pooled once.`);
      continue;
    }
    const safe = structuredClone(r);
    safe.title = safe.title.trim();
    if (
      safe.work &&
      (typeof safe.work.id !== "string" ||
        !safe.work.id ||
        typeof safe.work.source !== "string" ||
        !safe.work.source)
    )
      delete safe.work;
    if (
      safe.extent?.pages !== undefined &&
      (!Number.isInteger(safe.extent.pages) || safe.extent.pages <= 0)
    )
      delete safe.extent.pages;
    if (safe.catalogUrl) {
      try {
        if (!["http:", "https:"].includes(new URL(safe.catalogUrl).protocol))
          delete safe.catalogUrl;
      } catch {
        delete safe.catalogUrl;
      }
    }
    kept.set(key, safe);
  }
  return { records: [...kept.values()], notes };
}
