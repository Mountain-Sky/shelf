import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { catalogRecords } from "../lib/providers/fixtures";
import { HttpDemoProvider } from "../lib/providers/http-demo";
import {
  startCatalogServer,
  setCatalogStock,
  resetCatalogStock,
} from "../scripts/catalog-server";

const signal = () => new AbortController().signal;
test("expanded fixture catalog includes distinct subjects and formats without losing original records", () => {
  assert.ok(new Set(catalogRecords.map((r) => r.work?.id)).size >= 25);
  assert.equal(
    catalogRecords.find((r) => r.ref.id === "demo-1")?.title,
    "Project Hail Mary",
  );
  for (const subject of [
    "soccer",
    "artificial intelligence",
    "mystery",
    "science fiction",
    "nonfiction",
  ])
    assert.ok(catalogRecords.some((r) => r.subjects.includes(subject)));
  assert.ok(catalogRecords.some((r) => r.format === "audiobook"));
  assert.ok(catalogRecords.every((r) => r.provenance.kind === "fixture"));
});

test("independent HTTP catalog supports search, pagination and persistent mutable test holdings", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shelf-catalog-"));
  const stateFile = join(directory, "stock.json");
  let server = await startCatalogServer({ port: 0, stateFile });
  try {
    let provider = new HttpDemoProvider(server.url);
    const first = await provider.search(
      { field: "browse", text: "", limit: 2 },
      signal(),
    );
    assert.equal(first.records.length, 2);
    assert.ok(first.nextCursor);
    const next = await provider.search(
      { field: "browse", text: "", limit: 2, cursor: first.nextCursor },
      signal(),
    );
    assert.notEqual(first.records[0].ref.id, next.records[0].ref.id);
    const exact = await provider.search(
      { field: "identifier", text: "9780593135204", limit: 20 },
      signal(),
    );
    assert.equal(exact.records[0].ref.id, "demo-1");
    const ref = { provider: "demo", id: "demo-1" };
    assert.equal(
      (await provider.holdings([ref], ["RUST"], signal()))[0].copies,
      0,
    );
    await setCatalogStock(stateFile, "demo-1", "RUST", 3);
    const changed = (await provider.holdings([ref], ["RUST"], signal()))[0];
    assert.equal(changed.copies, 3);
    assert.equal(changed.status, "available");
    assert.ok(Date.now() - Date.parse(changed.observedAt) < 5000);
    await server.close();
    server = await startCatalogServer({ port: 0, stateFile });
    provider = new HttpDemoProvider(server.url);
    assert.equal(
      (await provider.holdings([ref], ["RUST"], signal()))[0].copies,
      3,
    );
    assert.equal(
      JSON.parse(await readFile(stateFile, "utf8")).overrides["demo-1"].RUST,
      3,
    );
    assert.equal(
      (
        await fetch(`${server.url}/set-stock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      404,
    );
    await resetCatalogStock(stateFile);
    assert.equal(
      (await provider.holdings([ref], ["RUST"], signal()))[0].copies,
      0,
    );
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("sandbox writes validate IDs and counts; invalid persisted state fails closed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "shelf-catalog-"));
  const stateFile = join(directory, "stock.json");
  const server = await startCatalogServer({ port: 0, stateFile });
  try {
    await assert.rejects(() =>
      setCatalogStock(stateFile, "invented", "RUST", 2),
    );
    await assert.rejects(() =>
      setCatalogStock(stateFile, "demo-1", "RUST", -1),
    );
    await assert.rejects(() =>
      setCatalogStock(stateFile, "demo-1", "NOT-A-BRANCH", 1),
    );
    assert.equal(
      (
        await fetch(`${server.url}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field: "browse", text: "", limit: 999 }),
        })
      ).status,
      400,
    );
    await writeFile(stateFile, "not json");
    const provider = new HttpDemoProvider(server.url);
    await assert.rejects(
      () =>
        provider.holdings(
          [{ provider: "demo", id: "demo-1" }],
          ["RUST"],
          signal(),
        ),
      /unavailable/,
    );
    assert.equal((await fetch(`${server.url}/health`)).status, 503);
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("HTTP adapter accepts only loopback origins and never falls back to local fixtures", async () => {
  for (const url of [
    "https://example.com",
    "http://localhost:4310",
    "http://127.0.0.1:4310/path",
    "http://user:secret@127.0.0.1:4310",
    "http://127.0.0.1:4310?other=1",
  ])
    assert.throws(() => new HttpDemoProvider(url), /loopback/);
  const directory = await mkdtemp(join(tmpdir(), "shelf-catalog-"));
  const stateFile = join(directory, "stock.json");
  const service = await startCatalogServer({ port: 0, stateFile });
  const provider = new HttpDemoProvider(service.url);
  await service.close();
  try {
    await assert.rejects(() =>
      provider.search({ field: "browse", text: "", limit: 2 }, signal()),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("HTTP adapter rejects malformed records and honors cancellation", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ records: [{ title: "Invented" }] }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const provider = new HttpDemoProvider(
    `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  );
  try {
    await assert.rejects(
      () => provider.search({ field: "browse", text: "", limit: 2 }, signal()),
      /Invalid/,
    );
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(() =>
      provider.search(
        { field: "browse", text: "", limit: 2 },
        controller.signal,
      ),
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeIdleConnections();
    });
  }
});
