import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/chat/route";
import { GET } from "../app/api/catalog/search/route";

test("unconfigured CARL•X returns explicit errors, never mock results", async () => {
  const previous = process.env.CATALOG_MODE;
  try {
    process.env.CATALOG_MODE = "carlx";
    const responses = [
      await POST(
        new NextRequest("http://localhost/api/chat", {
          method: "POST",
          body: JSON.stringify({ message: "Find The Hobbit" }),
        }),
      ),
      await GET(
        new NextRequest("http://localhost/api/catalog/search?q=Hobbit"),
      ),
    ];
    for (const response of responses) {
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.match(body.error, /CARL•X is not connected/);
      assert.equal(body.books, undefined);
    }
  } finally {
    if (previous === undefined) delete process.env.CATALOG_MODE;
    else process.env.CATALOG_MODE = previous;
  }
});
