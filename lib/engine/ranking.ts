import type { CatalogRecord, Evidence, Plan, Ranked } from "../types";
import { recordKey } from "../types";
export function evidenceValues(
  r: CatalogRecord,
): Record<Evidence["field"], string[]> {
  return {
    title: [r.title],
    contributors: r.contributors.map((c) => c.name),
    subjects: r.subjects,
    summary: r.summary ? [r.summary] : [],
  };
}
export function rankRecords(records: CatalogRecord[], plan: Plan): Ranked[] {
  const p = plan.preferences;
  const authorQuery = plan.queries.find((q) => q.field === "author");
  const identifierQuery = plan.queries.find((q) => q.field === "identifier");
  return records
    .filter(
      (r) =>
        (!authorQuery ||
          r.contributors.some((c) =>
            c.name.toLowerCase().includes(authorQuery.text.toLowerCase()),
          )) &&
        (!identifierQuery ||
          r.identifiers.some(
            (i) =>
              i.value.replace(/[- ]/g, "").toUpperCase() ===
              identifierQuery.text.toUpperCase(),
          )) &&
        (!p.format || r.format === p.format) &&
        p.requiredSubjects.every((s) => r.subjects.includes(s)) &&
        !p.excludedSubjects.some((s) => r.subjects.includes(s)) &&
        (p.maxPages === undefined ||
          (r.extent?.pages !== undefined && r.extent.pages <= p.maxPages)),
    )
    .map((record) => {
      const fields = evidenceValues(record);
      let score = 0;
      const evidence: Evidence[] = [];
      for (const term of plan.expandedQueries) {
        for (const [field, weight] of [
          ["title", 6],
          ["contributors", 5],
          ["subjects", 3],
          ["summary", 1],
        ] as const) {
          const value = fields[field].find((v) =>
            v.toLowerCase().includes(term),
          );
          if (value) {
            score += weight;
            evidence.push({ recordId: recordKey(record.ref), field, value });
            break;
          }
        }
      }
      const title = plan.query
        .replace(/^(find|where is|do you have|search for)\s+/i, "")
        .trim()
        .toLowerCase();
      if (record.title.toLowerCase() === title) score += 100;
      if (
        plan.queries.some(
          (q) =>
            q.field === "identifier" &&
            record.identifiers.some(
              (i) => i.value.replace(/[- ]/g, "") === q.text,
            ),
        )
      )
        score += 200;
      if (plan.queries.every((q) => q.field === "browse"))
        score = Math.max(1, score);
      const unique = [
        ...new Map(evidence.map((e) => [JSON.stringify(e), e])).values(),
      ];
      return {
        record,
        score,
        evidence: unique,
        reasons: unique.map((e) => `${e.field}: ${e.value}`),
      };
    })
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        recordKey(a.record.ref).localeCompare(recordKey(b.record.ref)),
    );
}
