import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPatronSession,
  patronSession,
  endPatronSession,
} from "../lib/application/patron-sessions";
test("opaque patron sessions isolate identities and revoke on logout or expiry", () => {
  const a = createPatronSession({ id: "11", username: "first" });
  const b = createPatronSession({ id: "12", username: "second" });
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(a, b);
  assert.equal(patronSession(a).patron.id, "11");
  assert.equal(patronSession(b).patron.id, "12");
  endPatronSession(a);
  assert.throws(() => patronSession(a));
  patronSession(b).expires = Date.now() - 1;
  assert.throws(() => patronSession(b));
  assert.throws(() => patronSession(undefined));
  assert.throws(() => patronSession("forged"));
});
