import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { demoGate } from "../lib/application/gate";

test("reviewer gate protects page and API and fails closed when unconfigured", async () => {
  const oldAccess = process.env.SHELF_ACCESS;
  const oldPassword = process.env.DEMO_ACCESS_PASSWORD;
  const password = "local-test-only-reviewer-password";
  process.env.SHELF_ACCESS = "private";
  process.env.DEMO_ACCESS_PASSWORD = password;
  const server = createServer((req, res) => demoGate(req, res, () => res.end("allowed")));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const route of ["/", "/api/chat", "/assets/app.js"]) {
      const denied = await fetch(base + route);
      assert.equal(denied.status, 401);
      assert.match(denied.headers.get("www-authenticate")!, /Basic/);
      const allowed = await fetch(base + route, {
        headers: { Authorization: "Basic " + Buffer.from("reviewer:" + password).toString("base64") },
      });
      assert.equal(await allowed.text(), "allowed");
    }
    delete process.env.DEMO_ACCESS_PASSWORD;
    assert.equal((await fetch(base)).status, 503);
  } finally {
    if (oldAccess === undefined) delete process.env.SHELF_ACCESS;
    else process.env.SHELF_ACCESS = oldAccess;
    if (oldPassword === undefined) delete process.env.DEMO_ACCESS_PASSWORD;
    else process.env.DEMO_ACCESS_PASSWORD = oldPassword;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
