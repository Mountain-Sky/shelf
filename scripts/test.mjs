import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const tests = readdirSync("tests")
  .filter((f) => f.endsWith(".test.ts"))
  .sort()
  .map((f) => `tests/${f}`);
const env = {
  ...process.env,
  CATALOG_MODE: "mock",
  OPENAI_API_KEY: "",
  SHELF_INSPECTOR: "0",
  NEXT_PUBLIC_SHELF_BRANCHES: "",
};
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...tests],
  { stdio: "inherit", env },
);
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
