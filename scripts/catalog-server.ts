/** Private synthetic catalog service. No patron accounts, SOAP emulation, or HTTP write endpoints. */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AddressInfo } from "node:net";
import type { CatalogQuery, Holding, RecordRef } from "../lib/types";
import { recordKey } from "../lib/types";
import { mockProvider } from "../lib/providers/mock";
import { catalogRecords } from "../lib/providers/fixtures";
import { branches } from "../lib/config/branches";

type StockState = {
  version: 1;
  overrides: Record<string, Record<string, number>>;
};
const recordIds = new Set(catalogRecords.map((r) => r.ref.id));
const branchIds = new Set<string>(branches.map((b) => b.id));
const emptyState = (): StockState => ({ version: 1, overrides: {} });
const defaultStateFile = resolve(
  process.env.SHELF_CATALOG_STATE || ".local/catalog.json",
);

function validState(value: unknown): value is StockState {
  if (!value || typeof value !== "object") return false;
  const state = value as StockState;
  return (
    state.version === 1 &&
    Boolean(state.overrides) &&
    typeof state.overrides === "object" &&
    !Array.isArray(state.overrides) &&
    Object.entries(state.overrides).every(
      ([id, values]) =>
        recordIds.has(id) &&
        values &&
        typeof values === "object" &&
        !Array.isArray(values) &&
        Object.entries(values).every(
          ([branch, copies]) =>
            branchIds.has(branch) &&
            Number.isInteger(copies) &&
            copies >= 0 &&
            copies <= 99,
        ),
    )
  );
}
async function readState(stateFile: string): Promise<StockState> {
  const value: unknown = JSON.parse(await readFile(stateFile, "utf8"));
  if (!validState(value))
    throw new Error(
      "The demo catalog state file is invalid; restore it or use the explicit reset command.",
    );
  return value;
}
async function saveState(stateFile: string, state: StockState): Promise<void> {
  await mkdir(dirname(stateFile), { recursive: true });
  const temporary = `${stateFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2) + "\n", {
    mode: 0o600,
  });
  await rename(temporary, stateFile);
}
async function ensureState(stateFile: string): Promise<void> {
  try {
    await readState(stateFile);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await saveState(stateFile, emptyState());
  }
}
export async function setCatalogStock(
  stateFile: string,
  recordId: string,
  branch: string,
  copies: number,
): Promise<void> {
  if (
    !recordIds.has(recordId) ||
    !branchIds.has(branch) ||
    !Number.isInteger(copies) ||
    copies < 0 ||
    copies > 99
  ) {
    throw new Error(
      "Choose an existing demo record, configured branch, and whole copy count from 0 to 99.",
    );
  }
  await ensureState(stateFile);
  const state = await readState(stateFile);
  state.overrides[recordId] = {
    ...state.overrides[recordId],
    [branch]: copies,
  };
  await saveState(stateFile, state);
}
export async function resetCatalogStock(stateFile: string): Promise<void> {
  await saveState(stateFile, emptyState());
}
function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}
async function jsonBody(request: IncomingMessage): Promise<unknown> {
  if (!request.headers["content-type"]?.startsWith("application/json"))
    throw new Error("JSON required");
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > 16_000) throw new Error("Request too large");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function validQuery(value: unknown): value is CatalogQuery {
  if (!value || typeof value !== "object") return false;
  const q = value as CatalogQuery;
  return (
    mockProvider.capabilities.fields.includes(q.field) &&
    typeof q.text === "string" &&
    q.text.length <= 1000 &&
    Number.isInteger(q.limit) &&
    q.limit > 0 &&
    q.limit <= 20 &&
    (q.cursor === undefined ||
      (typeof q.cursor === "string" && /^\d{1,6}$/.test(q.cursor)))
  );
}
function validHoldingsRequest(
  value: unknown,
): value is { records: RecordRef[]; branches: string[] } {
  if (!value || typeof value !== "object") return false;
  const q = value as { records: RecordRef[]; branches: string[] };
  return (
    Array.isArray(q.records) &&
    q.records.length <= 100 &&
    q.records.every(
      (r) =>
        r?.provider === "demo" &&
        typeof r.id === "string" &&
        recordIds.has(r.id),
    ) &&
    Array.isArray(q.branches) &&
    q.branches.length <= 3 &&
    q.branches.every((b) => typeof b === "string" && branchIds.has(b))
  );
}
async function resolvedHoldings(
  records: RecordRef[],
  selectedBranches: string[],
  stateFile: string,
): Promise<Holding[]> {
  const state = await readState(stateFile);
  const existing = await mockProvider.holdings(
    records,
    selectedBranches,
    new AbortController().signal,
  );
  const found = new Map(
    existing.map((h) => [`${recordKey(h.record)}:${h.branch}`, h]),
  );
  const observedAt = new Date().toISOString();
  for (const record of records)
    for (const branch of selectedBranches) {
      const copies = state.overrides[record.id]?.[branch];
      if (copies === undefined) continue;
      found.set(`${recordKey(record)}:${branch}`, {
        record,
        branch,
        copies,
        status: copies > 0 ? "available" : "unavailable",
        observedAt,
        provenance: {
          source: "Shelf synthetic catalog service",
          kind: "fixture",
          observedAt,
        },
      });
    }
  return [...found.values()];
}
export async function startCatalogServer(
  options: { port?: number; stateFile?: string } = {},
) {
  const stateFile = resolve(options.stateFile ?? defaultStateFile);
  await ensureState(stateFile);
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      if (request.method === "GET" && path === "/health") {
        // Read the persisted state so health also detects invalid/unreadable configuration.
        await readState(stateFile);
        return send(response, 200, {
          status: "ok",
          source: "synthetic-catalog-simulator",
          records: catalogRecords.length,
        });
      }
      if (request.method !== "POST" || !["/search", "/holdings"].includes(path))
        return send(response, 404, {
          error: "Read-only catalog endpoint not found",
        });
      let body: unknown;
      try {
        body = await jsonBody(request);
      } catch {
        return send(response, 400, {
          error: "Invalid or oversized JSON request",
        });
      }
      if (path === "/search") {
        if (!validQuery(body))
          return send(response, 400, { error: "Invalid search query" });
        return send(
          response,
          200,
          await mockProvider.search(body, new AbortController().signal),
        );
      }
      if (!validHoldingsRequest(body))
        return send(response, 400, { error: "Invalid holdings request" });
      return send(
        response,
        200,
        await resolvedHoldings(body.records, body.branches, stateFile),
      );
    } catch {
      send(response, 503, { error: "Demo catalog unavailable" });
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  await new Promise<void>((resolveReady, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 4310, "127.0.0.1", () => {
      server.off("error", reject);
      resolveReady();
    });
  });
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    stateFile,
    close: () =>
      new Promise<void>((resolveClose, reject) => {
        server.close((error) => (error ? reject(error) : resolveClose()));
        server.closeIdleConnections();
      }),
  };
}
function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
async function main() {
  const [command = "serve", ...args] = process.argv.slice(2);
  const stateFile = resolve(option(args, "--state") ?? defaultStateFile);
  if (command === "set-stock") {
    const copies = Number(option(args, "--copies"));
    await setCatalogStock(
      stateFile,
      option(args, "--record") ?? "",
      option(args, "--branch") ?? "",
      copies,
    );
    process.stdout.write(
      "Synthetic stock updated. The next Shelf search will read it.\n",
    );
    return;
  }
  if (command === "reset") {
    await resetCatalogStock(stateFile);
    process.stdout.write("Synthetic stock reset to fixtures.\n");
    return;
  }
  if (command !== "serve") throw new Error("Use serve, set-stock, or reset.");
  const port = Number(option(args, "--port") ?? 4310);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Port must be between 1 and 65535.");
  const service = await startCatalogServer({ stateFile, port });
  process.stdout.write(
    `Shelf synthetic catalog simulator listening at ${service.url}\n`,
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void service.close().then(() => process.exit(0));
    });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Catalog command failed"}\n`,
    );
    process.exitCode = 1;
  });
}
