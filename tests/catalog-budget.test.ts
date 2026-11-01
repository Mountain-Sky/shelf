import test from "node:test";
import assert from "node:assert/strict";
import { discover } from "../lib/engine/discovery";
import type { CatalogProvider } from "../lib/types";

test("application catalog deadline is honored without coupling the engine to Koha", async () => {
  const catalog: CatalogProvider = {
    id: "slow-test",
    kind: "catalog",
    capabilities: { fields: ["title", "browse", "keyword"] },
    async search() {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { records: [] };
    },
    async holdings() {
      return [];
    },
  };
  await assert.rejects(
    discover(
      { message: "Explore the collection" },
      { catalog, catalogTimeoutMs: 1 },
    ),
    /Catalog/,
  );
  const result = await discover(
    { message: "Explore the collection" },
    { catalog, catalogTimeoutMs: 500 },
  );
  assert.deepEqual(result.books, []);
  await assert.rejects(
    discover(
      { message: "Explore the collection" },
      { catalog, catalogTimeoutMs: Infinity },
    ),
    /Invalid catalog deadline/,
  );
});
