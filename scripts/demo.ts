import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { startCatalogServer, resetCatalogStock } from "./catalog-server";

const args = process.argv.slice(2);
function option(name: string) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}
function port(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535)
    throw Error("Ports must be integers from 1 to 65535.");
  return parsed;
}
async function main() {
  const appPort = port(option("--port") ?? process.env.SHELF_PORT, 3000);
  const catalogPort = port(
    option("--catalog-port") ?? process.env.SHELF_CATALOG_PORT,
    4310,
  );
  const host = process.env.SHELF_HOST || "127.0.0.1";
  if (!["127.0.0.1", "localhost", "0.0.0.0"].includes(host))
    throw Error(
      "Use a loopback host, or 0.0.0.0 with private-demo access configured.",
    );
  if (
    host === "0.0.0.0" &&
    (process.env.SHELF_ACCESS !== "private" ||
      !process.env.DEMO_ACCESS_PASSWORD ||
      process.env.DEMO_ACCESS_PASSWORD.length < 16)
  )
    throw Error(
      "Network hosting requires SHELF_ACCESS=private and a reviewer password of at least 16 characters.",
    );
  const stateFile = resolve(
    option("--state") ??
      process.env.SHELF_CATALOG_STATE ??
      ".local/catalog.json",
  );
  if (args.includes("--reset")) await resetCatalogStock(stateFile);
  const catalog = await startCatalogServer({ port: catalogPort, stateFile });
  console.log(
    `Shelf catalog simulator ready on loopback port ${catalogPort}; stock changes persist in ${stateFile}.`,
  );
  console.log(
    `Starting ${args.includes("--production") ? "production" : "development"} Shelf on port ${appPort}. Sample records and holdings only.`,
  );
  const child = spawn(
    process.execPath,
    [
      resolve("node_modules/next/dist/bin/next"),
      args.includes("--production") ? "start" : "dev",
      "--hostname",
      host,
      "--port",
      String(appPort),
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        CATALOG_MODE: "http-demo",
        DEMO_CATALOG_URL: catalog.url,
      },
    },
  );
  let stopping = false;
  async function stop(code: number) {
    if (stopping) return;
    stopping = true;
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      const kill = setTimeout(() => child.kill("SIGKILL"), 5000);
      kill.unref();
      await new Promise<void>((resolve) => child.once("exit", () => resolve()));
      clearTimeout(kill);
    }
    await catalog.close();
    process.exitCode = code;
  }
  child.once("error", async () => {
    console.error("Unable to start the Shelf application.");
    await catalog.close();
    process.exitCode = 1;
  });
  child.once("exit", (code) => {
    if (!stopping) void stop(code ?? 1);
  });
  process.once("SIGINT", () => void stop(0));
  process.once("SIGTERM", () => void stop(0));
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Demo startup failed.",
  );
  process.exitCode = 1;
});
