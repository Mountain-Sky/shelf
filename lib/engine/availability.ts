import type {
  CatalogProvider,
  CatalogBranch,
  Holding,
  Plan,
  Ranked,
  ResultBook,
  ResultEdition,
} from "../types";
import { recordKey, groupKey } from "../types";
import { budgets, bounded } from "./budgets";
import { branches } from "../config/branches";
export async function resolveAvailability(
  ranked: Ranked[],
  provider: CatalogProvider,
  plan: Plan,
  catalogTimeoutMs: number = budgets.catalogTimeoutMs,
  catalogBranches: CatalogBranch[] = branches,
): Promise<{
  books: ResultBook[];
  holdings: Holding[];
  notes: string[];
  grouping: {
    groupId: string;
    recordIds: string[];
    basis: "provider-work" | "record";
  }[];
}> {
  const selected = ranked.slice(0, budgets.holdingsRecords);
  const branchIds = plan.preferences.branch
    ? [plan.preferences.branch]
    : catalogBranches.map((b) => b.id);
  const notes: string[] = [];
  if (ranked.length > budgets.holdingsRecords)
    notes.push(
      "Holdings were checked only for the leading relevance candidates; this is not an exhaustive availability result set.",
    );
  let received: Holding[] = [];
  if (selected.length) {
    try {
      received = await bounded(catalogTimeoutMs, (s) =>
        provider.holdings(
          selected.map((r) => r.record.ref),
          branchIds,
          s,
        ),
      );
      if (!Array.isArray(received))
        throw new Error("Invalid holdings response");
    } catch {
      received = [];
      notes.push("Availability service failed; affected holdings are unknown.");
    }
  }
  const holdings: Holding[] = [];
  const groups = new Map<string, ResultEdition[]>();
  for (const r of selected) {
    const availability = branchIds.map((branch) => {
      const found = received.find(
        (h) =>
          h?.record?.provider === r.record.ref.provider &&
          h.record.id === r.record.ref.id &&
          h.branch === branch,
      );
      const age = found ? Date.now() - Date.parse(found.observedAt) : Infinity;
      if (
        found &&
        age >= -5000 &&
        age <= budgets.holdingsFreshMs &&
        ["available", "unavailable", "unknown"].includes(found.status) &&
        found.provenance?.kind === provider.kind &&
        typeof found.provenance.source === "string" &&
        (found.status === "unknown" ||
          (Number.isInteger(found.copies) &&
            found.copies !== null &&
            found.copies >= 0 &&
            (found.status === "available"
              ? found.copies > 0
              : found.copies === 0)))
      )
        return found.status === "unknown" ? { ...found, copies: null } : found;
      return {
        record: r.record.ref,
        branch,
        status: "unknown" as const,
        copies: null,
        observedAt: new Date().toISOString(),
        provenance: {
          source: provider.id,
          kind: provider.kind,
          observedAt: new Date().toISOString(),
        },
      };
    });
    holdings.push(...availability);
    const key = groupKey(r.record);
    if (key === plan.excludeResultId) continue;
    const editions = groups.get(key) ?? [];
    editions.push({
      record: r.record,
      availability,
      score: r.score,
      evidence: r.evidence,
    });
    groups.set(key, editions);
  }
  const grouping = [...groups].map(([groupId, editions]) => ({
    groupId,
    recordIds: editions.map((e) => recordKey(e.record.ref)),
    basis: editions[0].record.work
      ? ("provider-work" as const)
      : ("record" as const),
  }));
  const books = [...groups]
    .map(([id, editions]) => {
      const available = (e: ResultEdition) =>
        e.availability.some((h) => h.status === "available");
      const eligible =
        plan.preferences.availability === "only"
          ? editions.filter(available)
          : editions;
      if (!eligible.length) return undefined;
      eligible.sort(
        (a, b) =>
          (plan.preferences.availability !== "any"
            ? Number(available(b)) - Number(available(a))
            : 0) ||
          b.score - a.score ||
          Number(b.record.format === "print") -
            Number(a.record.format === "print") ||
          recordKey(a.record.ref).localeCompare(recordKey(b.record.ref)),
      );
      const primary = eligible[0];
      const r = primary.record;
      return {
        id,
        selectedRecordId: recordKey(r.ref),
        title: r.title,
        author:
          r.contributors.map((c) => c.name).join("; ") || "Contributor unknown",
        year: r.year,
        format: r.format,
        subjects: r.subjects,
        summary: r.summary ?? "No catalog summary supplied.",
        catalogUrl: r.catalogUrl,
        evidence: primary.evidence,
        editions,
        availability: primary.availability.map((h) => ({
          branch: h.branch,
          status: h.status,
          copies: h.copies,
          source: provider.kind === "fixture" ? "demo" : provider.id,
          observedAt: h.observedAt,
        })),
      } satisfies ResultBook;
    })
    .filter((b): b is NonNullable<typeof b> => Boolean(b));
  books.sort(
    (a, b) =>
      (plan.preferences.availability === "prefer"
        ? Number(b.availability.some((h) => h.status === "available")) -
          Number(a.availability.some((h) => h.status === "available"))
        : 0) ||
      Math.max(...b.editions.map((e) => e.score)) -
        Math.max(...a.editions.map((e) => e.score)) ||
      a.id.localeCompare(b.id),
  );
  if (holdings.some((h) => h.status === "unknown"))
    notes.push(
      "Some holdings are missing, invalid, or stale; unknown availability is not a claim of zero copies.",
    );
  return { books: books.slice(0, budgets.results), holdings, notes, grouping };
}
