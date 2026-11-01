import type { Branch, CatalogProvider, Ranked, ResultBook } from "../types";
export async function resolveAvailability(
  ranked: Ranked[],
  provider: CatalogProvider,
  branch: Branch,
): Promise<ResultBook[]> {
  const holdings = await provider.availability(
    ranked.map((r) => r.book),
    branch,
  );
  return ranked.map(({ book }) => ({
    ...book,
    availability: holdings[book.id] ?? [
      {
        branch: branch || "Unknown",
        status: "unknown" as const,
        copies: null,
        source: provider.mode,
      },
    ],
  }));
}
