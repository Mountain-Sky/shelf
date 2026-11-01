import test from "node:test";
import assert from "node:assert/strict";
import { discover } from "../lib/discovery";
import { mockProvider } from "../lib/providers/mock";
import { CarlXProvider } from "../lib/providers/carlx";
import { catalogRecords } from "../lib/providers/fixtures";
import { recordKey } from "../lib/types";
import type { CatalogProvider, Intelligence, SessionState } from "../lib/types";
import { budgets, bounded, parallelMap } from "../lib/engine/budgets";
import { planDiscovery } from "../lib/engine/planning";
const search = (
  message: string,
  state?: SessionState,
  catalog: CatalogProvider = mockProvider,
) => discover({ message, state }, { catalog });

test("known title ranks first; identity and relevance are deterministic", async () => {
  const a = await search("find The Hobbit");
  const b = await search("find The Hobbit");
  assert.equal(a.books[0].title, "The Hobbit");
  assert.deepEqual(
    a.books.map((b) => b.id),
    b.books.map((b) => b.id),
  );
  assert.equal(a.trace.intent, "known_item");
  assert.ok(a.trace.modelCalls.every((c) => c.status === "disabled"));
});
test("unmatched search returns no unrelated fallback", async () => {
  assert.deepEqual((await search("zzzxxyy")).books, []);
});
test("followup expands terms and applies explicit subject constraints", async () => {
  const a = await search("funny books");
  const b = await search("Only mysteries", a.state);
  assert.ok(b.books.length);
  assert.ok(b.books.every((b) => b.subjects.includes("mystery")));
  assert.ok(b.state.terms.includes("humor"));
  const kids = await search("adventure for kids");
  assert.ok(kids.books.length);
  assert.ok(kids.books.every((b) => b.subjects.includes("children")));
});
test("same source ID pools once, but distinct records with identical metadata survive", async () => {
  const original = structuredClone(catalogRecords[0]);
  const alias = { ...original, ref: { provider: "demo", id: "alias" } };
  const r = await search("space", undefined, {
    ...mockProvider,
    async search() {
      return { records: [original, original, alias] };
    },
  });
  assert.equal(r.books.length, 1);
  assert.equal(r.books[0].editions.length, 2);
  assert.ok(r.trace.notes.some((n) => n.includes("Duplicate source record")));
});
test("matching title/author without trusted work ID does not merge records", async () => {
  const first = { ...catalogRecords[0], work: undefined };
  const second = { ...first, ref: { provider: "demo", id: "separate" } };
  const r = await search("space", undefined, {
    ...mockProvider,
    async search() {
      return { records: [first, second] };
    },
  });
  assert.equal(r.books.length, 2);
});
test("format-specific availability stays attached to its edition", async () => {
  const r = await discover(
    { message: "find Project Hail Mary", branch: "RUST" },
    { catalog: mockProvider },
  );
  const book = r.books[0];
  assert.equal(book.format, "print");
  assert.equal(book.availability[0].copies, 0);
  assert.equal(
    book.editions.find((e) => e.record.format === "audiobook")?.availability[0]
      .status,
    "available",
  );
});
test("prefer available promotes available edition; only available excludes unknown and zero", async () => {
  const r = await search("Project Hail Mary preferably available at Rust");
  assert.equal(r.books[0].format, "audiobook");
  const strict = await search("Project Hail Mary only available at Rust");
  assert.ok(strict.books.length);
  assert.ok(
    strict.books.every((b) =>
      b.availability.some((a) => a.status === "available"),
    ),
  );
  const none = await search("The Hobbit only available at Rust", undefined, {
    ...mockProvider,
    async holdings() {
      return [];
    },
  });
  assert.equal(none.books.length, 0);
  assert.ok(none.notices.some((n) => n.includes("unknown")));
});
test("holdings failure and stale observations preserve discovery with unknown status", async () => {
  for (const catalog of [
    {
      ...mockProvider,
      async holdings() {
        throw Error("private upstream detail");
      },
    },
    {
      ...mockProvider,
      async holdings() {
        return [
          {
            record: catalogRecords[0].ref,
            branch: "ASH",
            status: "available" as const,
            copies: 3,
            observedAt: "2000-01-01T00:00:00Z",
            provenance: catalogRecords[0].provenance,
          },
        ];
      },
    },
  ]) {
    const r = await discover(
      { message: "Project Hail Mary", branch: "ASH" },
      { catalog },
    );
    assert.ok(r.books.length);
    assert.equal(r.books[0].availability[0].status, "unknown");
    assert.equal(r.books[0].availability[0].copies, null);
    assert.ok(!JSON.stringify(r).includes("private upstream detail"));
  }
});
test("references resolve against displayed order and shorter uses the selected edition", async () => {
  const a = await search("space");
  assert.ok(a.state.snapshot.length > 1);
  const selected = a.state.snapshot[1];
  const b = await search("More like the second one, but shorter", a.state);
  assert.equal(b.state.preferences.maxPages, selected.pages! - 1);
  assert.ok(!b.books.some((book) => book.id === selected.id));
  assert.ok(
    b.books.every((book) =>
      book.editions.every((e) => e.record.extent!.pages! < selected.pages!),
    ),
  );
});
test("ambiguous reference or missing length asks instead of guessing", async () => {
  const a = await search("More like the second one");
  assert.match(a.clarification ?? "", /Which displayed title/);
  const state: SessionState = {
    goal: "mystery",
    terms: ["mystery"],
    preferences: {
      availability: "any",
      requiredSubjects: [],
      excludedSubjects: [],
    },
    snapshot: [
      {
        id: "unknown",
        recordIds: [],
        title: "Unknown length",
        subjects: ["mystery"],
      },
    ],
  };
  const b = await search("More like the first one, but shorter", state);
  assert.match(b.clarification ?? "", /no verified page count/);
  assert.deepEqual(b.state, state);
});
test("format filters and exclusions persist; explicit updates replace preferences", async () => {
  const a = await search("space");
  const b = await search("Only audiobooks", a.state);
  assert.ok(b.books.length);
  assert.ok(b.books.every((b) => b.format === "audiobook"));
  const c = await search("Actually print", b.state);
  assert.ok(c.books.length);
  assert.ok(c.books.every((b) => b.format === "print"));
  const p = planDiscovery({
    message: "Actually nonfiction",
    state: {
      ...a.state,
      preferences: { ...a.state.preferences, requiredSubjects: ["mystery"] },
    },
  });
  assert.deepEqual(p.preferences.requiredSubjects, ["nonfiction"]);
  const excluded = await search("No mystery", a.state);
  assert.ok(excluded.books.every((b) => !b.subjects.includes("mystery")));
});
test("strict page filter excludes unknown extents without relaxing criteria", async () => {
  const r = await search("mystery under 300 pages");
  assert.ok(r.books.length);
  assert.ok(
    r.books.every((b) =>
      b.editions.every((e) => (e.record.extent?.pages ?? Infinity) < 300),
    ),
  );
  assert.ok(r.notices.some((n) => n.includes("page counts")));
});
test("partial retrieval failure returns useful records; total outage errors", async () => {
  const r = await search("find The Hobbit", undefined, {
    ...mockProvider,
    async search(q, s) {
      if (q.field === "title") throw Error("SOAP fault");
      return mockProvider.search(q, s);
    },
  });
  assert.ok(r.books.length);
  assert.ok(r.notices.some((n) => n.includes("incomplete")));
  await assert.rejects(
    () =>
      search("space", undefined, {
        ...mockProvider,
        async search() {
          throw Error("offline");
        },
      }),
    /Catalog unavailable/,
  );
  await assert.rejects(
    () => search("space", undefined, new CarlXProvider()),
    /Catalog unavailable/,
  );
});
test("pagination respects request and candidate budgets", async () => {
  let calls = 0;
  const r = await search("space", undefined, {
    ...mockProvider,
    async search(q) {
      calls++;
      return {
        records: Array.from({ length: 20 }, (_, i) => ({
          ...catalogRecords[0],
          ref: { provider: "demo", id: `${calls}-${i}` },
          work: undefined,
        })),
        nextCursor: String(calls),
      };
    },
  });
  assert.ok(calls <= budgets.queries);
  assert.ok(r.trace.candidates.length <= budgets.candidates);
  assert.ok(r.books.length <= budgets.results);
  assert.ok(r.notices.some((n) => n.includes("bounded")));
});
test("bounded stages time out and concurrency is limited", async () => {
  await assert.rejects(
    () => bounded(10, () => new Promise(() => {})),
    /deadline/,
  );
  let active = 0,
    max = 0;
  const results = await parallelMap([1, 2, 3, 4], 2, async (n) => {
    active++;
    max = Math.max(max, active);
    await new Promise((r) => setTimeout(r, 5));
    active--;
    return n;
  });
  assert.equal(max, 2);
  assert.deepEqual(results, [1, 2, 3, 4]);
});
const ai: Intelligence = {
  model: "test-model",
  async interpret() {
    return { intent: "recommendation", terms: ["space"] };
  },
  async assess() {
    return [];
  },
};
test("AI cannot fabricate records or unsupported explanation evidence", async () => {
  const result = await discover(
    { message: "space" },
    {
      catalog: mockProvider,
      intelligence: {
        ...ai,
        async assess() {
          return [{ recordId: "invented", evidence: [] }];
        },
      },
    },
  );
  assert.equal(result.trace.modelCalls.at(-1)?.status, "fallback");
  assert.ok(!result.reply.includes("invented"));
  const record = catalogRecords[0];
  const invalid = await discover(
    { message: "space" },
    {
      catalog: mockProvider,
      intelligence: {
        ...ai,
        async assess() {
          return [
            {
              recordId: recordKey(record.ref),
              evidence: [
                {
                  recordId: recordKey(record.ref),
                  field: "subjects",
                  value: "guaranteed perfect for age nine",
                },
              ],
            },
          ];
        },
      },
    },
  );
  assert.equal(invalid.trace.modelCalls.at(-1)?.status, "fallback");
});
test("validated AI evidence is bounded and cannot remove strict constraints", async () => {
  let calls = 0;
  const result = await discover(
    { message: "space only audiobooks" },
    {
      catalog: mockProvider,
      intelligence: {
        ...ai,
        async interpret() {
          calls++;
          return { intent: "recommendation", terms: ["space", "fantasy"] };
        },
        async assess(_query, candidates) {
          calls++;
          const r = candidates[0];
          return [
            {
              recordId: recordKey(r.ref),
              evidence: [
                { recordId: recordKey(r.ref), field: "title", value: r.title },
              ],
            },
          ];
        },
      },
    },
  );
  assert.equal(calls, 2);
  assert.ok(result.books.every((b) => b.format === "audiobook"));
  assert.ok(result.trace.modelCalls.every((c) => c.status === "success"));
});
test("model exceptions and malformed proposals fall back to deterministic discovery", async () => {
  for (const intelligence of [
    {
      ...ai,
      async interpret() {
        throw Error("secret");
      },
    },
    {
      ...ai,
      async interpret() {
        return null as unknown as Awaited<
          ReturnType<Intelligence["interpret"]>
        >;
      },
    },
  ]) {
    const r = await discover(
      { message: "space" },
      { catalog: mockProvider, intelligence },
    );
    assert.ok(r.books.length);
    assert.equal(r.trace.modelCalls[0].status, "fallback");
    assert.ok(!JSON.stringify(r).includes("secret"));
  }
});

test("branch updates preserve similarity seed exclusions", async () => {
  const a = await search("space");
  const seed = a.state.snapshot[1];
  const b = await search("More like the second one", a.state);
  const c = await discover(
    {
      message: "Update branch",
      branch: "ASH",
      action: "branch",
      state: b.state,
    },
    { catalog: mockProvider },
  );
  assert.equal(c.state.seedResultId, seed.id);
  assert.ok(!c.books.some((book) => book.id === seed.id));
});
test("format-only search browses without requiring conversation", async () => {
  const r = await search("Only audiobooks");
  assert.ok(r.books.length);
  assert.ok(r.books.every((b) => b.format === "audiobook"));
});
test("malformed holdings are a partial failure, not a whole search failure", async () => {
  const r = await search("The Hobbit", undefined, {
    ...mockProvider,
    async holdings() {
      return null as unknown as Awaited<
        ReturnType<CatalogProvider["holdings"]>
      >;
    },
  });
  assert.ok(r.books.length);
  assert.equal(r.books[0].availability[0].status, "unknown");
});

test("page numbers cannot hijack ordinal references; multiple references clarify", async () => {
  const a = await search("space");
  const b = planDiscovery({
    message: "Under 300 pages, more like the second one",
    state: a.state,
  });
  assert.equal(b.excludeResultId, a.state.snapshot[1].id);
  assert.equal(b.preferences.maxPages, 299);
  assert.ok(
    planDiscovery({
      message: "More like the first one and the second one",
      state: a.state,
    }).clarification,
  );
});

test("initial collection browse is useful and makes no model calls", async () => {
  let calls = 0;
  const intelligence: Intelligence = {
    ...ai,
    async interpret() {
      calls++;
      throw Error("must not call");
    },
    async assess() {
      calls++;
      throw Error("must not call");
    },
  };
  const r = await discover(
    { message: "Explore the collection" },
    { catalog: mockProvider, intelligence },
  );
  assert.ok(r.books.length > 0);
  assert.equal(calls, 0);
  assert.equal(r.trace.queries[0].query.field, "browse");
  assert.ok(r.trace.queries.length <= budgets.queries);
});
test("explicit similarity accepts only IDs from the last displayed snapshot", async () => {
  const a = await search("Explore the collection");
  const selected = a.books[0];
  const b = await discover(
    {
      message: "More like this",
      action: "similar",
      selectedResultId: selected.id,
      state: a.state,
    },
    { catalog: mockProvider },
  );
  assert.equal(b.state.seedResultId, selected.id);
  assert.ok(b.books.length);
  assert.ok(!b.books.some((book) => book.id === selected.id));
  const invalid = await discover(
    {
      message: "More like this",
      action: "similar",
      selectedResultId: "arbitrary-record",
      state: a.state,
    },
    { catalog: mockProvider },
  );
  assert.match(invalid.clarification ?? "", /Which displayed title/);
  assert.equal(invalid.trace.queries.length, 0);
  assert.deepEqual(invalid.state, a.state);
});
test("named-title similarity retrieves a verified seed then explores its subjects", async () => {
  const r = await search("Something like Project Hail Mary");
  assert.equal(r.trace.queries[0].query.field, "title");
  assert.equal(r.trace.queries[0].query.text, "Project Hail Mary");
  assert.ok(r.books.length);
  assert.ok(!r.books.some((book) => book.title === "Project Hail Mary"));
  assert.ok(r.books.some((book) => book.title === "The Martian"));
  assert.ok(r.trace.queries.length <= budgets.queries);
});
test("compound seed request retains availability preference and admits uncertain style evidence", async () => {
  const r = await search(
    "I loved Project Hail Mary but want something less technical, preferably available at Rust",
  );
  assert.ok(r.books.length);
  assert.equal(r.state.preferences.branch, "RUST");
  assert.equal(r.state.preferences.availability, "prefer");
  assert.ok(!r.books.some((b) => b.title === "Project Hail Mary"));
  assert.ok(r.notices.some((n) => n.includes("difficulty")));
});
test("unknown seed asks clarification rather than inventing a reference record", async () => {
  const r = await search("Something like An Invented Unknown Reference");
  assert.ok(r.clarification);
  assert.equal(r.books.length, 0);
  assert.equal(r.trace.queries.length, 1);
});
test("seed search and pagination share one global request budget", async () => {
  let count = 0;
  const catalog: CatalogProvider = {
    ...mockProvider,
    async search(q, s) {
      count++;
      const page = await mockProvider.search(q, s);
      return { ...page, nextCursor: "next-" + count };
    },
  };
  const r = await search(
    "Something like Project Hail Mary",
    undefined,
    catalog,
  );
  assert.ok(r.books.length);
  assert.ok(count <= budgets.queries);
  assert.equal(r.trace.queries.length, count);
});
test("UI format and availability controls replace and remove active constraints", async () => {
  const a = await search("Explore the collection");
  const b = await search("Actually only audiobooks", a.state);
  assert.ok(b.books.length);
  assert.ok(b.books.every((book) => book.format === "audiobook"));
  const c = await search("Actually print", b.state);
  assert.ok(c.books.length);
  assert.equal(c.state.preferences.format, "print");
  const d = await search("Actually all formats", c.state);
  assert.equal(d.state.preferences.format, undefined);
  const only = await search("Actually only available", d.state);
  assert.equal(only.state.preferences.availability, "only");
  const prefer = await search("Actually prefer available", only.state);
  assert.equal(prefer.state.preferences.availability, "prefer");
  const all = await search("Actually include unavailable", prefer.state);
  assert.equal(all.state.preferences.availability, "any");
});
test("author and ISBN requests use dedicated catalog query fields", async () => {
  const authored = await search("author: Andy Weir");
  assert.equal(authored.trace.queries[0].query.field, "author");
  assert.ok(authored.books.length);
  assert.ok(authored.books.every((b) => b.author.includes("Andy Weir")));
  const isbn = "9780261103344";
  const book = {
    ...catalogRecords[7],
    identifiers: [{ scheme: "isbn", value: isbn }],
  };
  const exact = await search("ISBN: " + isbn, undefined, {
    ...mockProvider,
    async search() {
      return { records: [book] };
    },
  });
  assert.equal(exact.trace.queries[0].query.field, "identifier");
  assert.equal(exact.trace.queries[0].query.text, isbn);
  assert.equal(exact.books[0].title, book.title);
});

test("fiction and nonfiction switches use explicit catalog subjects", async () => {
  const a = await search("Explore the collection");
  const b = await search("Actually nonfiction", a.state);
  assert.ok(b.books.length);
  assert.ok(b.books.every((book) => book.subjects.includes("nonfiction")));
  const c = await search("Actually fiction", b.state);
  assert.ok(c.books.length);
  assert.ok(
    c.books.every(
      (book) =>
        book.subjects.includes("fiction") &&
        !book.subjects.includes("nonfiction"),
    ),
  );
});
