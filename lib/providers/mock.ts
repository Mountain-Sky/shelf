import type { CatalogProvider } from "../types";
import { demo } from "./fixtures";
export const mockProvider: CatalogProvider = {
  mode: "demo",
  async search(plan) {
    return demo
      .filter((b) =>
        plan.expandedQueries.some((term) =>
          [b.title, b.author, b.summary, ...b.subjects]
            .join(" ")
            .toLowerCase()
            .includes(term),
        ),
      )
      .map((b) => ({
        ...b,
        subjects: [...b.subjects],
        branches: { ...b.branches },
      }));
  },
  async availability(books, branch) {
    return Object.fromEntries(
      books.map((b) => [
        b.id,
        (branch ? [branch] : ["ASH", "RUST", "PUR"]).map((code) => ({
          branch: code,
          status:
            b.branches[code] === undefined
              ? "unknown"
              : b.branches[code] > 0
                ? "available"
                : "unavailable",
          copies: b.branches[code] ?? null,
          source: "demo" as const,
        })),
      ]),
    );
  },
};
