import type {
  Assessment,
  CatalogPage,
  CatalogRecord,
  CatalogProvider,
  CatalogQuery,
  DiscoveryInput,
  DiscoveryResult,
  DiscoveryTrace,
  Intelligence,
  Interpretation,
  ModelCall,
} from "../types";
import { recordKey, groupKey } from "../types";
import { planDiscovery, queriesFor } from "./planning";
import { normalize } from "./normalization";
import { evidenceValues, rankRecords } from "./ranking";
import { resolveAvailability } from "./availability";
import { composeResponse } from "./response";
import { budgets, bounded, parallelMap } from "./budgets";

export type EngineDependencies = {
  catalog: CatalogProvider;
  intelligence?: Intelligence;
  /** Application-selected stage deadline; engine remains provider independent. */
  catalogTimeoutMs?: number;
};
export async function discover(
  input: DiscoveryInput,
  dependencies: EngineDependencies,
): Promise<DiscoveryResult> {
  const { catalog, intelligence } = dependencies;
  const catalogTimeoutMs =
    dependencies.catalogTimeoutMs ?? budgets.catalogTimeoutMs;
  if (
    !Number.isFinite(catalogTimeoutMs) ||
    catalogTimeoutMs < 1 ||
    catalogTimeoutMs > 6000
  )
    throw Error("Invalid catalog deadline");
  const started = performance.now();
  let last = started;
  const stagesMs: Record<string, number> = {};
  const mark = (name: string) => {
    const now = performance.now();
    stagesMs[name] = Math.round((now - last) * 100) / 100;
    last = now;
  };
  const plan = planDiscovery(input);
  const notes: string[] = [];
  const unsupportedSubjects =
    !catalog.capabilities.fields.includes("subject") &&
    (plan.preferences.requiredSubjects.length > 0 ||
      plan.preferences.excludedSubjects.length > 0);
  const unsupportedReply = unsupportedSubjects
    ? `I cannot verify the requested genre filters (${[...plan.preferences.requiredSubjects, ...plan.preferences.excludedSubjects.map((s) => "exclude " + s)].join(", ")}) with this catalog adapter. Genre metadata is unavailable, so I have not substituted unrelated books. Try a specific title or author.`
    : undefined;
  if (unsupportedReply) notes.push(unsupportedReply);
  if (/\b(?:tomorrow|next week|next month)\b/i.test(plan.query))
    notes.push(
      "Only current availability can be checked. Future pickup availability is not confirmed, and no copy has been reserved.",
    );
  const calls: ModelCall[] = [];
  const traceQueries: DiscoveryTrace["queries"] = [];
  const collected: CatalogRecord[] = [];
  let seedAttempts = 0;
  async function modelCall<T>(
    stage: ModelCall["stage"],
    fn: (signal: AbortSignal) => Promise<T>,
    valid: (value: T) => boolean,
  ): Promise<T | undefined> {
    if (!intelligence || calls.length >= budgets.modelCalls) {
      calls.push({ stage, status: "disabled", durationMs: 0 });
      return;
    }
    const start = performance.now();
    try {
      const output = await bounded(budgets.modelTimeoutMs, fn);
      if (!valid(output)) throw Error("Invalid model output");
      calls.push({
        stage,
        status: "success",
        durationMs: Math.round(performance.now() - start),
        model: intelligence.model,
      });
      return output;
    } catch {
      calls.push({
        stage,
        status: "fallback",
        durationMs: Math.round(performance.now() - start),
        model: intelligence.model,
      });
      notes.push(
        `AI ${stage} unavailable or invalid; deterministic behavior was retained.`,
      );
    }
  }
  if (
    !plan.clarification &&
    !plan.browse &&
    !plan.seedTitle &&
    plan.intent !== "known_item" &&
    input.action !== "branch"
  ) {
    const interpreted = await modelCall<Interpretation>(
      "interpretation",
      (s) =>
        intelligence!.interpret(
          input.message,
          { goal: plan.query, terms: plan.expandedQueries },
          s,
        ),
      (v) =>
        Boolean(v) &&
        [
          "known_item",
          "recommendation",
          "availability",
          "exploration",
        ].includes(v.intent) &&
        Array.isArray(v.terms) &&
        v.terms.length <= budgets.terms &&
        v.terms.every(
          (t) => typeof t === "string" && t.length > 0 && t.length <= 80,
        ),
    );
    if (interpreted) {
      plan.expandedQueries = [
        ...new Set([
          ...plan.expandedQueries,
          ...interpreted.terms.map((t) => t.toLowerCase()),
        ]),
      ].slice(0, budgets.terms);
      if (plan.intent === "exploration") plan.intent = interpreted.intent;
      plan.queries = queriesFor(plan);
    }
  } else
    calls.push({ stage: "interpretation", status: "disabled", durationMs: 0 });
  mark("interpretationAndPlanning");
  if (plan.seedTitle && !plan.clarification) {
    const field = catalog.capabilities.fields.includes("title")
      ? "title"
      : "keyword";
    const query: CatalogQuery = {
      field,
      text: plan.seedTitle,
      limit: budgets.pageSize,
    };
    if (!catalog.capabilities.fields.includes(field)) {
      plan.clarification =
        "This catalog cannot look up the reference title. Try a title or subject search instead.";
    } else {
      seedAttempts++;
      let page: CatalogPage;
      try {
        page = await bounded(catalogTimeoutMs, (s) => catalog.search(query, s));
        if (!Array.isArray(page.records)) throw Error("Invalid seed response");
        traceQueries.push({
          query,
          status: "success",
          count: page.records.length,
        });
      } catch {
        throw Error("Catalog unavailable");
      }
      const normalized = normalize(
        page.records.slice(0, budgets.pageSize),
        catalog,
      );
      notes.push(...normalized.notes);
      const seedName = plan.seedTitle
        .toLocaleLowerCase()
        .replace(/[“”"']/g, "")
        .trim();
      const matches = normalized.records.filter(
        (r) =>
          r.title
            .toLocaleLowerCase()
            .replace(/[“”"']/g, "")
            .trim() === seedName,
      );
      const identities = new Set(matches.map(groupKey));
      if (identities.size !== 1) {
        plan.clarification =
          identities.size > 1
            ? "I found more than one catalog work with that title. Search the title and select the edition you mean."
            : "I could not verify that reference title in this catalog. Try its exact title, or describe a subject you want to explore.";
      } else {
        const seed = matches.find((r) => r.format === "print") ?? matches[0];
        plan.excludeResultId = groupKey(seed);
        plan.query = `Similar to ${seed.title}`;
        plan.expandedQueries = [
          ...new Set([...seed.subjects, ...plan.preferences.requiredSubjects]),
        ].slice(0, budgets.terms);
        if (!plan.expandedQueries.length)
          plan.clarification =
            "This reference title has no catalog subjects to support a similarity search. Tell me a subject or theme you would like.";
        plan.queries = queriesFor(plan);
        collected.push(...matches);
        notes.push(
          `Similarity starts from the catalog subjects of “${seed.title}”; it does not establish equivalent style or reading difficulty.`,
        );
      }
    }
  }
  mark("seedRetrieval");
  const queries = plan.queries.filter((q) =>
    catalog.capabilities.fields.includes(q.field),
  );
  if (queries.length < plan.queries.length)
    notes.push("The provider does not support every planned search field.");
  const requests =
    plan.clarification || unsupportedSubjects
      ? []
      : queries.slice(0, budgets.queries - seedAttempts);
  const pages = await parallelMap(
    requests,
    budgets.concurrency,
    async (query) => {
      try {
        const page = await bounded(catalogTimeoutMs, (s) =>
          catalog.search(query, s),
        );
        if (!page || !Array.isArray(page.records))
          throw Error("Invalid catalog page");
        return { query, page };
      } catch {
        return { query, page: undefined };
      }
    },
  );
  let attempts = pages.length + seedAttempts;
  for (const { query, page } of pages) {
    traceQueries.push({
      query,
      status: page ? "success" : "failed",
      count: page?.records.length ?? 0,
    });
    if (page) collected.push(...page.records.slice(0, budgets.pageSize));
  }
  // Pagination uses remaining global request slots; never an unbounded crawl.
  for (const initial of pages) {
    let cursor = initial.page?.nextCursor;
    const seen = new Set<string>();
    while (
      cursor &&
      attempts < budgets.queries &&
      collected.length < budgets.candidates &&
      !seen.has(cursor)
    ) {
      seen.add(cursor);
      attempts++;
      const query: CatalogQuery = { ...initial.query, cursor };
      let page: CatalogPage | undefined;
      try {
        page = await bounded(catalogTimeoutMs, (s) => catalog.search(query, s));
        if (!Array.isArray(page?.records)) page = undefined;
      } catch {
        page = undefined;
      }
      traceQueries.push({
        query,
        status: page ? "success" : "failed",
        count: page?.records.length ?? 0,
      });
      if (page) collected.push(...page.records.slice(0, budgets.pageSize));
      cursor = page?.nextCursor;
    }
  }
  if (traceQueries.some((q) => q.status === "failed"))
    notes.push(
      "One or more catalog searches failed; results may be incomplete.",
    );
  if (requests.length && traceQueries.every((q) => q.status === "failed"))
    throw Error("Catalog unavailable");
  if (!requests.length && !plan.clarification)
    notes.push("No supported search could be executed.");
  if (
    pages.some((p) => p.page?.nextCursor) ||
    collected.length >= budgets.candidates
  )
    notes.push(
      "Retrieval is bounded; this is not an exhaustive catalog result set.",
    );
  mark("retrieval");
  const normalized = normalize(collected.slice(0, budgets.candidates), catalog);
  notes.push(...normalized.notes);
  mark("normalization");
  let ranked = rankRecords(normalized.records, plan);
  if (
    plan.preferences.maxPages !== undefined &&
    normalized.records.some((r) => r.extent?.pages === undefined)
  )
    notes.push(
      "Records without verified page counts cannot satisfy the strict length filter.",
    );
  if (
    /less technical|beginner.friendly|fast.paced|hates reading/i.test(
      input.message,
    )
  )
    notes.push(
      "Reading difficulty, pacing, and suitability are not established by these catalog fields; consider clarifying the preference.",
    );
  mark("ranking");
  if (ranked.length && !plan.clarification && !plan.browse) {
    const candidates = ranked.slice(0, 20).map((r) => r.record);
    const assessment = await modelCall<Assessment>(
      "assessment",
      (s) => intelligence!.assess(plan.query, candidates, s),
      (v) =>
        Array.isArray(v) &&
        v.length <= 10 &&
        v.every((a) => {
          const r = candidates.find((r) => recordKey(r.ref) === a?.recordId);
          return (
            r &&
            Array.isArray(a.evidence) &&
            a.evidence.length > 0 &&
            a.evidence.length <= 3 &&
            a.evidence.every(
              (e) =>
                e &&
                e.recordId === a.recordId &&
                ["title", "contributors", "subjects", "summary"].includes(
                  e.field,
                ) &&
                evidenceValues(r)[e.field].includes(e.value),
            )
          );
        }),
    );
    if (assessment) {
      const selected = new Map(assessment.map((a) => [a.recordId, a]));
      ranked = ranked
        .map((r) => {
          const a = selected.get(recordKey(r.record.ref));
          return a
            ? {
                ...r,
                score: r.score + 2,
                evidence: [...r.evidence, ...a.evidence],
                reasons: [
                  ...r.reasons,
                  "AI preference supported by supplied metadata (inference).",
                ],
              }
            : r;
        })
        .sort(
          (a, b) =>
            b.score - a.score ||
            recordKey(a.record.ref).localeCompare(recordKey(b.record.ref)),
        );
    }
  } else calls.push({ stage: "assessment", status: "disabled", durationMs: 0 });
  mark("assessment");
  const availability = await resolveAvailability(
    ranked,
    catalog,
    plan,
    catalogTimeoutMs,
  );
  notes.push(...availability.notes);
  mark("availabilityAndGrouping");
  const books = availability.books;
  const state =
    plan.clarification && input.state
      ? input.state
      : {
          seedResultId: plan.excludeResultId,
          goal: plan.query,
          terms: plan.expandedQueries,
          preferences: plan.preferences,
          snapshot: books.map((b) => ({
            id: b.id,
            recordIds: b.editions.map((e) => recordKey(e.record.ref)),
            title: b.title,
            subjects: b.subjects,
            pages: b.editions.find(
              (e) => recordKey(e.record.ref) === b.selectedRecordId,
            )?.record.extent?.pages,
          })),
        };
  let reply =
    unsupportedReply ??
    composeResponse(books, catalog.kind === "fixture", plan.clarification);
  if (/\b(?:tomorrow|next week|next month)\b/i.test(plan.query))
    reply +=
      " Only current availability can be checked. Future pickup availability is not confirmed, and no copy has been reserved.";
  mark("response");
  stagesMs.total = Math.round((performance.now() - started) * 100) / 100;
  const trace: DiscoveryTrace = {
    intent: plan.intent,
    query: plan.query,
    expandedQueries: plan.expandedQueries,
    constraints: plan.constraints,
    candidateCount: collected.length,
    candidates: normalized.records.map((r) => ({
      id: recordKey(r.ref),
      title: r.title,
    })),
    queries: traceQueries,
    grouping: availability.grouping,
    ranked: ranked.map((r) => ({
      id: recordKey(r.record.ref),
      title: r.record.title,
      score: r.score,
      reasons: r.reasons,
    })),
    availability: availability.holdings.map((h) => ({
      recordId: recordKey(h.record),
      branch: h.branch,
      status: h.status,
    })),
    stagesMs,
    modelCalls: calls,
    notes,
  };
  return {
    books,
    reply,
    source: catalog.kind === "fixture" ? "demo" : catalog.id,
    notices: notes.filter(
      (note) => !note.startsWith("Duplicate source record"),
    ),
    clarification: plan.clarification,
    suggestedActions: books.length
      ? [
          "Only audiobooks",
          "Only mysteries",
          ...(books.length > 1
            ? ["More like the second one"]
            : ["Explore the collection"]),
        ]
      : ["Clear filters", "Explore the collection"],
    state,
    trace,
  };
}
