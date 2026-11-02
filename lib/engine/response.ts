import type { ResultBook } from "../types";
export function composeResponse(
  books: ResultBook[],
  fixture: boolean,
  clarification?: string,
  constrained = true,
): string {
  if (clarification) return clarification;
  if (!books.length && !constrained)
    return "No titles matched this catalog request. The title or author may be missing from this catalog, or the spelling may differ. Check the name, or tell me a genre or theme you enjoy.";
  if (!books.length)
    return `No ${fixture ? "demo " : ""}titles matched the supported constraints. Try a broader search; no filters were silently relaxed.`;
  const lead = `Found ${books.length} ${fixture ? "demo " : ""}titles. `;
  const selections = books
    .slice(0, 3)
    .map((b) => {
      const evidence = b.evidence.find((e) => e.field === "subjects");
      return `${b.title}${evidence ? ` — catalog subject: “${evidence.value}”` : ""}`;
    })
    .join("; ");
  return (
    lead +
    selections +
    ". " +
    (fixture
      ? "All edition details and holdings here are test fixtures, not live LCPL availability."
      : "Availability is an observation, not a borrowing or hold guarantee.")
  );
}
