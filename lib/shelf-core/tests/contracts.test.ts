import test from "node:test";
import assert from "node:assert/strict";
import { POST, GET } from "../lib/application/http";
const NextRequest = Request;
import { SessionStore } from "../lib/application/sessions";
import { mockProvider } from "../lib/providers/mock";
import { OpenAIIntelligence } from "../lib/ai/openai";
import { budgets } from "../lib/config/budgets";
import type { SessionState } from "../lib/types";
const state: SessionState = {
  goal: "space",
  terms: ["space"],
  preferences: {
    availability: "any",
    requiredSubjects: [],
    excludedSubjects: [],
  },
  snapshot: [],
};
const post = (body: string, origin?: string) =>
  POST(
    new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body,
      headers: origin ? { origin } : undefined,
    }),
  );
test("provider contract: normalized identities, pagination, separate timestamped holdings", async () => {
  const first = await mockProvider.search(
    { field: "browse", text: "", limit: 2 },
    new AbortController().signal,
  );
  assert.equal(first.records.length, 2);
  assert.ok(first.nextCursor);
  const second = await mockProvider.search(
    { field: "browse", text: "", limit: 2, cursor: first.nextCursor },
    new AbortController().signal,
  );
  assert.notEqual(first.records[0].ref.id, second.records[0].ref.id);
  assert.ok(
    first.records.every(
      (r) =>
        r.ref.provider === mockProvider.id &&
        r.provenance.kind === "fixture" &&
        !("branches" in r),
    ),
  );
  const holdings = await mockProvider.holdings(
    first.records.map((r) => r.ref),
    ["ASH"],
    new AbortController().signal,
  );
  assert.ok(holdings.length);
  assert.ok(
    holdings.every(
      (h) => h.branch === "ASH" && Number.isFinite(Date.parse(h.observedAt)),
    ),
  );
});
test("session store enforces expiry, capacity and revision without storing histories", () => {
  let now = 0;
  const store = new SessionStore(100, 1, () => now);
  const first = store.begin();
  assert.throws(() => store.begin(), /Too many/);
  const session = first.commit(state);
  assert.throws(() => store.begin(session.id, 0), /Results changed/);
  const next = store.begin(session.id, session.revision);
  assert.equal(next.state?.goal, "space");
  assert.throws(
    () => store.begin(session.id, session.revision),
    /Results changed/,
  );
  next.cancel();
  now = 101;
  assert.throws(() => store.begin(session.id, session.revision), /expired/);
  store.begin().cancel();
});
test("API validates JSON, branch, bounds, session shape and cross-origin calls", async () => {
  for (const body of [
    "{",
    "null",
    "[]",
    JSON.stringify({ message: "space", branch: "NO" }),
    JSON.stringify({ message: "x".repeat(501) }),
    JSON.stringify({ message: "space", session: { id: "guess", revision: 1 } }),
  ])
    assert.equal((await post(body)).status, 400);
  assert.equal((await post("x".repeat(8001))).status, 413);
  assert.equal(
    (
      await post(
        JSON.stringify({ message: "space" }),
        "https://unrelated.example",
      )
    ).status,
    403,
  );
});
test("API returns results and a versioned session, not engine state or default diagnostics", async () => {
  const response = await post(
    JSON.stringify({ message: "find The Hobbit", branch: "ASH" }),
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.books[0].title, "The Hobbit");
  assert.equal(data.source, "demo");
  assert.ok(data.session.id);
  assert.ok(!("state" in data));
  if (process.env.SHELF_INSPECTOR !== "1") assert.ok(!("trace" in data));
  const follow = await post(
    JSON.stringify({ message: "Only audiobooks", session: data.session }),
  );
  assert.equal(follow.status, 200);
  assert.equal(
    (await post(JSON.stringify({ message: "space", session: data.session })))
      .status,
    409,
  );
});
test("conventional catalog endpoint runs without conversation or model configuration", async () => {
  const response = await GET(
    new NextRequest(
      "http://localhost/api/catalog/search?q=The%20Hobbit&branch=ASH",
    ),
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.books[0].title, "The Hobbit");
  assert.ok(!("session" in data));
});
test("OpenAI adapter isolates wire schema and disables storage", async () => {
  const client = new OpenAIIntelligence(
    "test-key",
    "test-model",
    async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      assert.equal(body.max_output_tokens, budgets.modelOutputTokens);
      assert.equal(body.text.format.type, "json_schema");
      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    intent: "exploration",
                    terms: ["space"],
                  }),
                },
              ],
            },
          ],
        }),
      );
    },
  );
  assert.deepEqual(
    await client.interpret(
      "space",
      { goal: "space", terms: [] },
      new AbortController().signal,
    ),
    { intent: "exploration", terms: ["space"] },
  );
  await assert.rejects(
    () =>
      client.interpret(
        "x".repeat(20000),
        { goal: "", terms: [] },
        new AbortController().signal,
      ),
    /budget/,
  );
});

test("same-origin request respects the actual Host header", async () => {
  const response = await POST(
    new NextRequest("http://localhost:3100/api/chat", {
      method: "POST",
      headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
      body: JSON.stringify({ message: "The Hobbit" }),
    }),
  );
  assert.equal(response.status, 200);
});

test("idle session data is removed without a subsequent request", async () => {
  const store = new SessionStore(10, 1);
  const session = store.begin().commit(state);
  await new Promise((resolve) => setTimeout(resolve, 40));
  // Inspect storage specifically to prove cleanup is proactive, not just begin() expiry.
  assert.equal(
    (store as unknown as { entries: Map<string, unknown> }).entries.size,
    0,
  );
  assert.throws(() => store.begin(session.id, session.revision), /expired/);
});
