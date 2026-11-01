import type { ResultBook } from "../../lib/types";
export const READING_LIST_KEY = "shelf.reading-list.v1";
export const MAX_SAVED = 100;
export type SavedBook = Pick<ResultBook, "id" | "title" | "author">;
export function savedBook(book: SavedBook): SavedBook {
  return { id: book.id, title: book.title, author: book.author };
}
/** Browser storage is untrusted. Persist bibliographic labels, never holdings or sessions. */
export function readSaved(raw: string | null): SavedBook[] {
  if (!raw || raw.length > 250000) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const found = new Set<string>();
    return data
      .filter((b): b is SavedBook => {
        if (!b || typeof b !== "object") return false;
        if (
          !["id", "title", "author"].every(
            (k) =>
              typeof b[k] === "string" &&
              b[k].length > 0 &&
              b[k].length <= 1000,
          )
        )
          return false;
        if (found.has(b.id)) return false;
        found.add(b.id);
        return true;
      })
      .slice(0, MAX_SAVED)
      .map(savedBook);
  } catch {
    return [];
  }
}
export function readingListText(books: SavedBook[]): string {
  return books.map((b) => `${b.title} — ${b.author}`).join("\n");
}
