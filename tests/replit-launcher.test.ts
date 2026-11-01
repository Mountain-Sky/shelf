import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function launch(overrides: Record<string, string>) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/demo.ts", "--replit", "--production"],
    {
      encoding: "utf8",
      timeout: 10000,
      env: {
        ...process.env,
        SHELF_PUBLIC_ORIGIN: "",
        DEMO_ACCESS_PASSWORD: "",
        REPLIT_DEV_DOMAIN: "workspace.example.test",
        ...overrides,
      },
    },
  );
}

test("Replit production refuses to use workspace origin as deployment origin", () => {
  const result = launch({});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set SHELF_PUBLIC_ORIGIN/);
});

test("Replit production rejects non-HTTPS and non-origin URLs", () => {
  for (const value of ["http://example.test", "https://example.test/path"]) {
    const result = launch({ SHELF_PUBLIC_ORIGIN: value });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /HTTPS origin/);
  }
});

test("Replit production refuses network startup without a strong reviewer password", () => {
  const result = launch({
    SHELF_PUBLIC_ORIGIN: "https://demo.example.test",
    DEMO_ACCESS_PASSWORD: "short",
    SHELF_HOST: "127.0.0.1",
    SHELF_ACCESS: "local",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Network hosting requires/);
});
