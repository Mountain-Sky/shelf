import type { Book, Plan, Ranked } from "../types";
export function rankBooks(candidates: Book[], plan: Plan): Ranked[] {
  const seen = new Set<string>();
  const editions = new Set<string>();
  return candidates
    .filter((book) => {
      const edition = [book.title, book.author, book.year ?? "", book.format]
        .map((v) => String(v).trim().toLowerCase())
        .join("|");
      if (seen.has(book.id) || editions.has(edition)) return false;
      seen.add(book.id);
      editions.add(edition);
      return true;
    })
    .filter((book) => plan.constraints.every((c) => book.subjects.includes(c)))
    .map((book) => {
      const fields = [
        book.title,
        book.author,
        book.subjects.join(" "),
        book.summary,
      ].map((s) => s.toLowerCase());
      let score = 0;
      const reasons: string[] = [];
      for (const term of plan.expandedQueries) {
        const i = fields.findIndex((f) => f.includes(term));
        if (i >= 0) {
          score += [6, 5, 3, 1][i];
          reasons.push(`Matches “${term}”`);
        }
      }
      return { book, score, reasons };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.book.id.localeCompare(b.book.id));
}
