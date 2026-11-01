import app from "./app";
import { logger } from "./lib/logger";
import { startCatalogServer } from "@workspace/shelf-core/catalog-server";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Keep the original independent catalog simulator and its stock-change CLI.
process.env.CATALOG_MODE ??= "http-demo";
const catalog = process.env.CATALOG_MODE === "http-demo"
  ? await startCatalogServer({ port: 4310 })
  : undefined;
if (catalog) process.env.DEMO_CATALOG_URL ??= catalog.url;

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => {
    server.close(() => { void catalog?.close().finally(() => process.exit(0)); });
  });
