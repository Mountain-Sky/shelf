import test from "node:test";
import assert from "node:assert/strict";
import { authorizeDemo } from "../lib/application/access";
const password = "test-only-review-password";
const auth = (value: string) =>
  "Basic " + Buffer.from(value).toString("base64");
test("private demo denies missing or wrong credentials and fails closed without configuration", () => {
  assert.equal(authorizeDemo(null, { private: true }), "unconfigured");
  assert.equal(
    authorizeDemo(null, { private: true, password: "short" }),
    "unconfigured",
  );
  assert.equal(
    authorizeDemo(null, { private: true, password }),
    "unauthorized",
  );
  assert.equal(
    authorizeDemo(auth("reviewer:incorrect"), { private: true, password }),
    "unauthorized",
  );
  assert.equal(
    authorizeDemo(auth("admin:" + password), { private: true, password }),
    "unauthorized",
  );
  assert.equal(
    authorizeDemo(auth("reviewer:" + password), { private: true, password }),
    "allowed",
  );
});
test("local loopback development needs no reviewer login", () =>
  assert.equal(authorizeDemo(null, { private: false }), "allowed"));
