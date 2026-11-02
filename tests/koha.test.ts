import test from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { KohaProvider, parseKohaMarc } from "../lib/providers/koha";
import type { CatalogQuery } from "../lib/types";

// Protocol fixtures exercise transport and mappings; they are not a live Koha instance.
const signal = () => new AbortController().signal;
const ref = { provider: "koha", id: "42" };
const browse: CatalogQuery = { field: "browse", text: "", limit: 20 };
const biblio = (changes: Record<string, unknown> = {}) => ({
  biblio_id: 42,
  title: "The Hobbit",
  author: "J. R. R. Tolkien",
  isbn: "9780547928227",
  publication_year: "1937",
  pages: "310 p.",
  item_type: "BK",
  abstract: "A catalog-supplied synopsis.",
  opac_suppressed: 0,
  ...changes,
});
const item = (changes: Record<string, unknown> = {}) => ({
  item_id: 1,
  biblio_id: 42,
  holding_library_id: "SANDBOX",
  _status: ["available"],
  ...changes,
});
function reply(res: ServerResponse, value: unknown, total?: number) {
  const marc = res.getHeader("X-Test-Marc") === "1";
  res.removeHeader("X-Test-Marc");
  if (marc && Array.isArray(value))
    value = value.map((raw) =>
      raw && typeof raw === "object" && "biblio_id" in raw
        ? {
            fields: [
              { "999": { subfields: [{ c: String(raw.biblio_id) }] } },
              ...(raw.marcFields ?? []),
            ],
          }
        : raw,
    );
  res.setHeader(
    "Content-Type",
    marc ? "application/marc-in-json" : "application/json",
  );
  if (total !== undefined) res.setHeader("X-Total-Count", String(total));
  res.end(JSON.stringify(value));
}
type Handler = (url: URL, req: IncomingMessage, res: ServerResponse) => void;
async function fixture(handler: Handler) {
  const requests: {
    path: string;
    authorization?: string;
    embed?: string;
    body: string;
  }[] = [];
  let tokenCalls = 0;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url!, "http://127.0.0.1");
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    requests.push({
      path: req.url!,
      authorization: req.headers.authorization,
      embed: req.headers["x-koha-embed"] as string | undefined,
      body: Buffer.concat(chunks).toString("utf8"),
    });
    if (url.pathname === "/api/v1/oauth/token") {
      tokenCalls++;
      reply(res, {
        access_token: "test-only-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
      return;
    }
    if (req.headers.accept === "application/marc-in-json")
      res.setHeader("X-Test-Marc", "1");
    const detailFilter = JSON.parse(url.searchParams.get("q") || "{}");
    const requestedIds = detailFilter.biblio_id?.["-in"];
    // Handlers still own the response; expose the requested page to the paging fixture.
    if (requestedIds?.length === 1 && requestedIds[0] === 44)
      url.searchParams.set("_page", "2");
    handler(url, req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  return {
    provider: new KohaProvider({
      baseUrl,
      clientId: "test-client",
      clientSecret: "test-only-secret",
      branchMap: { RUST: "SANDBOX", ASH: "OTHER" },
      formatMap: { BK: "print" },
    }),
    requests,
    tokenCalls: () => tokenCalls,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

test("Koha maps only supplied bibliographic facts and omits suppressed or unverified visibility", async () => {
  const f = await fixture((_url, _req, res) =>
    reply(
      res,
      [
        biblio({ publication_year: null, copyright_date: 1937 }),
        biblio({
          biblio_id: 43,
          title: "Unknown metadata",
          author: null,
          isbn: null,
          publication_year: "[19--]",
          pages: "xii, 400 pages",
          item_type: "toString",
          abstract: null,
        }),
        biblio({ biblio_id: 44, opac_suppressed: 1 }),
        biblio({ biblio_id: 45, opac_suppressed: null }),
      ],
      4,
    ),
  );
  try {
    const result = await f.provider.search(browse, signal());
    assert.equal(result.records.length, 2);
    const known = result.records[0];
    assert.deepEqual(known.ref, ref);
    assert.equal(known.title, "The Hobbit");
    assert.equal(known.year, 1937);
    assert.equal(known.extent?.pages, 310);
    assert.equal(known.format, "print");
    assert.equal(known.provenance.kind, "catalog");
    assert.equal(known.provenance.source, "koha");
    assert.ok(Number.isFinite(Date.parse(known.provenance.observedAt)));
    assert.deepEqual(known.subjects, []);
    const unknown = result.records[1];
    assert.equal(unknown.format, "unknown");
    assert.equal(unknown.extent, undefined);
    assert.equal(unknown.year, undefined);
    assert.equal(unknown.summary, undefined);
    assert.deepEqual(unknown.contributors, []);
    assert.deepEqual(unknown.identifiers, []);
    assert.ok(f.provider.capabilities.fields.includes("subject"));
  } finally {
    await f.close();
  }
});

test("Koha encodes literal query text, bounded pagination and shares OAuth across concurrent requests", async () => {
  const urls: URL[] = [];
  const f = await fixture((url, _req, res) => {
    urls.push(url);
    reply(res, [biblio()], 5);
  });
  try {
    const query: CatalogQuery = { field: "title", text: "100%_\\?&", limit: 1 };
    const [first] = await Promise.all([
      f.provider.search(query, signal()),
      f.provider.search(
        { field: "author", text: "Tolkien", limit: 1 },
        signal(),
      ),
    ]);
    assert.equal(first.nextCursor, "2");
    await f.provider.search({ ...query, cursor: first.nextCursor }, signal());
    assert.equal(f.tokenCalls(), 1);
    const firstUrl = urls.find(
      (u) => JSON.parse(u.searchParams.get("q")!).title,
    )!;
    assert.deepEqual(JSON.parse(firstUrl.searchParams.get("q")!), {
      opac_suppressed: 0,
      title: { "-like": "%100\\%\\_\\\\?&%" },
    });
    assert.equal(firstUrl.searchParams.get("_per_page"), "1");
    assert.ok(urls.some((u) => u.searchParams.get("_page") === "2"));
    assert.ok(
      f.requests
        .filter((r) => !r.path.includes("oauth"))
        .every((r) => r.authorization === "Bearer test-only-token"),
    );
    const form = new URLSearchParams(f.requests[0].body);
    assert.equal(form.get("grant_type"), "client_credentials");
    assert.equal(form.get("client_id"), "test-client");
    assert.equal(form.get("client_secret"), "test-only-secret");
    const count = f.requests.length;
    await assert.rejects(
      f.provider.search(
        { ...query, cursor: "https://elsewhere.test" },
        signal(),
      ),
      /cursor/,
    );
    await assert.rejects(
      f.provider.search({ ...query, field: "unsupported" as never }, signal()),
      /Unsupported/,
    );
    assert.equal(f.requests.length, count);
  } finally {
    await f.close();
  }
});

test("Koha bibliographic search paginates without total headers while holdings require completeness evidence", async () => {
  const f = await fixture((url, _req, res) => {
    if (url.pathname.endsWith("/items")) {
      reply(res, [item()]);
      return;
    }
    const page = Number(url.searchParams.get("_page"));
    reply(
      res,
      page === 2
        ? [biblio({ biblio_id: 44 })]
        : [biblio(), biblio({ biblio_id: 43 })],
    );
  });
  try {
    const query: CatalogQuery = { field: "browse", text: "", limit: 2 };
    const first = await f.provider.search(query, signal());
    assert.equal(first.records.length, 2);
    assert.equal(first.nextCursor, "2");
    const second = await f.provider.search(
      { ...query, cursor: first.nextCursor },
      signal(),
    );
    assert.equal(second.records.length, 1);
    assert.equal(second.nextCursor, undefined);
    const bounded = await f.provider.search(
      { ...query, cursor: "100" },
      signal(),
    );
    assert.equal(bounded.nextCursor, undefined);
    const holding = (await f.provider.holdings([ref], ["RUST"], signal()))[0];
    assert.equal(holding.status, "unknown");
    assert.equal(holding.copies, null);
  } finally {
    await f.close();
  }
});

test("Koha holdings use computed statuses; restrictions override available and unknown evidence remains unknown", async () => {
  let statuses: unknown[] = [
    ["available"],
    ["available", "restricted"],
    ["in_transit"],
    ["on_hold"],
  ];
  const f = await fixture((_url, _req, res) =>
    reply(
      res,
      statuses.map((s, i) => item({ item_id: i + 1, _status: s })),
      statuses.length,
    ),
  );
  try {
    const rows = await f.provider.holdings(
      [ref],
      ["RUST", "ASH", "UNMAPPED"],
      signal(),
    );
    assert.deepEqual(
      rows.map((r) => [r.branch, r.status, r.copies]),
      [
        ["RUST", "available", 1],
        ["ASH", "unavailable", 0],
        ["UNMAPPED", "unknown", null],
      ],
    );
    assert.equal(
      f.requests.find((r) => r.path.includes("/items"))?.embed,
      "_status",
    );
    assert.ok(f.requests.every((r) => !r.path.includes("patron")));
    for (const status of [
      ["available", "in_bundle"],
      ["checked_out"],
      ["recalled"],
      ["not_for_loan"],
    ]) {
      statuses = [status];
      assert.equal(
        (await f.provider.holdings([ref], ["RUST"], signal()))[0].status,
        "unavailable",
      );
    }
    for (const status of [
      undefined,
      [],
      ["unknown_new_status"],
      ["available", "unknown_new_status"],
    ]) {
      statuses = [["available"], status];
      const result = (await f.provider.holdings([ref], ["RUST"], signal()))[0];
      assert.equal(result.status, "unknown");
      assert.equal(result.copies, null);
    }
  } finally {
    await f.close();
  }
});

test("Koha holdings pagination counts complete pages but refuses incomplete or contradictory item evidence", async () => {
  let scenario = "complete";
  const f = await fixture((url, _req, res) => {
    const page = Number(url.searchParams.get("_page"));
    if (scenario === "complete") reply(res, [item({ item_id: page })], 2);
    else if (scenario === "missing-total") reply(res, [item()]);
    else if (scenario === "changed-total")
      reply(res, [item({ item_id: page })], page === 1 ? 2 : 3);
    else if (scenario === "duplicate") reply(res, [item()], 2);
    else if (scenario === "foreign") reply(res, [item({ biblio_id: 999 })], 1);
    else if (scenario === "missing-branch")
      reply(res, [item({ holding_library_id: null })], 1);
    else if (scenario === "empty-truncated") reply(res, [], 2);
    else reply(res, [item({ item_id: page })], 999);
  });
  try {
    assert.equal(
      (await f.provider.holdings([ref], ["RUST"], signal()))[0].copies,
      2,
    );
    for (scenario of [
      "missing-total",
      "changed-total",
      "duplicate",
      "foreign",
      "missing-branch",
      "empty-truncated",
      "budget-truncated",
    ]) {
      const before = f.requests.length;
      const result = (await f.provider.holdings([ref], ["RUST"], signal()))[0];
      assert.equal(result.status, "unknown", scenario);
      assert.equal(result.copies, null, scenario);
      assert.ok(f.requests.length - before <= 3, "page budget respected");
    }
  } finally {
    await f.close();
  }
});

test("Koha transport rejects redirects, invalid JSON types and malformed search totals", async () => {
  let mode = "redirect";
  let redirected = false;
  const f = await fixture((url, _req, res) => {
    if (url.pathname.endsWith("/unexpected")) {
      redirected = true;
      reply(res, [], 0);
      return;
    }
    if (mode === "redirect") {
      res.writeHead(302, { Location: "/api/v1/unexpected" });
      res.end();
    } else if (mode === "html") {
      res.setHeader("Content-Type", "text/html");
      res.end("Login page");
    } else if (mode === "invalid-json") {
      res.setHeader("Content-Type", "application/json");
      res.end("not-json-test-secret-fragment");
    } else if (mode === "oversized")
      reply(res, "x".repeat(2 * 1024 * 1024 + 1), 0);
    else {
      res.setHeader("X-Total-Count", "invalid");
      reply(res, [biblio()]);
    }
  });
  try {
    for (mode of ["redirect", "html", "oversized", "invalid-total"])
      await assert.rejects(f.provider.search(browse, signal()));
    mode = "invalid-json";
    await assert.rejects(
      f.provider.search(browse, signal()),
      (error: Error) =>
        error.message === "Koha returned invalid JSON." &&
        !error.message.includes("test-secret-fragment"),
    );
    assert.equal(redirected, false);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(f.provider.search(browse, controller.signal));
  } finally {
    await f.close();
  }
});

test("Koha authorization failure never becomes fixture data and invalidates the cached token", async () => {
  let authorized = false;
  const f = await fixture((_url, _req, res) => {
    if (!authorized) {
      res.statusCode = 401;
      reply(res, { error: "unauthorized" });
    } else reply(res, [biblio()], 1);
  });
  try {
    await assert.rejects(f.provider.search(browse, signal()), /401/);
    authorized = true;
    assert.equal(
      (await f.provider.search(browse, signal())).records[0].ref.provider,
      "koha",
    );
    assert.equal(f.tokenCalls(), 2);
  } finally {
    await f.close();
  }
});

test("Koha configuration refuses unsafe origins and missing explicit library mappings", () => {
  const options = {
    baseUrl: "https://sandbox.example.test/api/v1",
    clientId: "test",
    clientSecret: "test",
    branchMap: { RUST: "SANDBOX" },
  };
  for (const baseUrl of [
    "http://example.test/api/v1",
    "https://user:pass@example.test/api/v1",
    "https://example.test/api/v1?token=x",
    "https://example.test/other",
  ])
    assert.throws(() => new KohaProvider({ ...options, baseUrl }));
  assert.throws(() => new KohaProvider({ ...options, branchMap: {} }));
  assert.throws(() => new KohaProvider({ ...options, clientSecret: "" }));
});

test("Koha keyword retrieval matches terms across metadata rather than requiring a contiguous phrase", async () => {
  let query: unknown;
  const f = await fixture((url, _req, res) => {
    if (_req.headers.accept === "application/marc-in-json")
      query = JSON.parse(url.searchParams.get("q")!);
    reply(res, [biblio()], 1);
  });
  try {
    await f.provider.search(
      { field: "keyword", text: "left hand darkness", limit: 20 },
      signal(),
    );
    assert.deepEqual(query, {
      opac_suppressed: 0,
      "-and": ["left", "hand", "darkness"].map((term) => ({
        "-or": ["title", "author", "abstract", "metadata.metadata"].map(
          (field) => ({
            [field]: { "-like": `%${term}%` },
          }),
        ),
      })),
    });
  } finally {
    await f.close();
  }
});

test("MARC subject parsing preserves headings, ignores authority IDs, and does not infer mystery from titles", () => {
  const parsed = parseKohaMarc({
    fields: [
      { "999": { subfields: [{ c: "123" }] } },
      { "245": { subfields: [{ a: "A mystery title" }] } },
      {
        "650": {
          subfields: [
            { a: "Police." },
            { z: "Sweden." },
            { v: "Fiction." },
            { "9": "377" },
          ],
        },
      },
      {
        "655": {
          subfields: [
            { a: "Detective and mystery stories." },
            { "2": "lcgft" },
          ],
        },
      },
    ],
  });
  assert.equal(parsed.id, "123");
  assert.ok(parsed.subjects.includes("mystery"));
  assert.ok(parsed.subjects.includes("detective and mystery stories"));
  assert.ok(!parsed.subjects.includes("377"));
  assert.deepEqual(
    parseKohaMarc({
      fields: [
        { "999": { subfields: [{ c: "2" }] } },
        { "245": { subfields: [{ a: "Mystery" }] } },
      ],
    }).subjects,
    [],
  );
  assert.throws(
    () => parseKohaMarc({ fields: [{ "001": "123" }] }),
    /identity/,
  );
});

test("subject candidates require parsed MARC evidence and matching detail identities", async () => {
  let mismatch = false;
  const f = await fixture((_url, req, res) => {
    reply(
      res,
      [
        biblio({
          biblio_id:
            mismatch && req.headers.accept === "application/json" ? 99 : 42,
          marcFields: [
            { "655": { subfields: [{ a: "Detective and mystery stories." }] } },
          ],
        }),
      ],
      1,
    );
  });
  try {
    const result = await f.provider.search(
      { field: "subject", text: "mystery", limit: 20 },
      signal(),
    );
    assert.deepEqual(result.records[0].subjects, [
      "detective and mystery stories",
      "mystery",
    ]);
    assert.equal(
      (
        await f.provider.search(
          { field: "subject", text: "romance", limit: 20 },
          signal(),
        )
      ).records.length,
      0,
    );
    mismatch = true;
    await assert.rejects(f.provider.search(browse, signal()), /identity/);
  } finally {
    await f.close();
  }
});

test('MARC enrichment keeps supplied metadata and explicit genre/format evidence', () => {
 const p=parseKohaMarc({fields:[
 {'999':{subfields:[{c:'42'}]}}, {'520':{subfields:[{a:'Catalog synopsis'}]}},
 {'041':{subfields:[{a:'eng'}]}}, {'300':{subfields:[{a:'xii, 312 pages'}]}},
 {'020':{subfields:[{a:'9780547928227 (paperback)'}]}},
 {'700':{subfields:[{a:'Other, Author'}]}}, {'655':{subfields:[{a:'Fantasy fiction.'}]}}
 ]});
 assert.equal(p.summary,'Catalog synopsis');assert.equal(p.language,'eng');assert.equal(p.pages,312);
 assert.deepEqual(p.isbns,['9780547928227']);assert.deepEqual(p.contributors,['Other, Author']);
 assert.ok(p.subjects.includes('fantasy'));assert.equal(p.format,undefined);
 assert.ok(!p.subjects.includes('nonfiction'));
});
