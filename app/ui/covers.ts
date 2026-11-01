import type { CatalogRecord } from "../../lib/types";

/** Match only an ISBN supplied by the selected edition; never guess from a title. */
export function coverIsbn(
  record?: Pick<CatalogRecord, "identifiers">,
): string | undefined {
  for (const id of record?.identifiers ?? []) {
    if (id.scheme.toUpperCase() !== "ISBN") continue;
    for (const token of id.value.match(/[0-9Xx][0-9Xx -]*[0-9Xx]/g) ?? []) {
      const isbn = token.replace(/[ -]/g, "").toUpperCase();
      if (/^\d{9}[\dX]$/.test(isbn)) {
        const total = [...isbn].reduce(
          (sum, digit, i) =>
            sum + (digit === "X" ? 10 : Number(digit)) * (10 - i),
          0,
        );
        if (total % 11 === 0) return isbn;
      }
      if (
        /^97[89]\d{10}$/.test(isbn) &&
        [...isbn].reduce(
          (sum, digit, i) => sum + Number(digit) * (i % 2 ? 3 : 1),
          0,
        ) %
          10 ===
          0
      )
        return isbn;
    }
  }
}
export function coverUrl(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-M.jpg?default=false`;
}
