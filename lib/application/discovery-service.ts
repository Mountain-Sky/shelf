import { discover } from "../engine/discovery";
import { mockProvider } from "../providers/mock";
import { HttpDemoProvider } from "../providers/http-demo";
import { CarlXProvider } from "../providers/carlx";
import { kohaFromEnvironment } from "./koha-config";
import { OpenAIIntelligence } from "../ai/openai";
import { SessionStore } from "./sessions";
import type { DiscoveryInput, DiscoveryTrace, CatalogProvider } from "../types";
import { AccountError } from "../circulation";
import { branches as configuredBranches } from "../config/branches";
// Shared through development reloads; process-local and deliberately ephemeral.
const globalStore = globalThis as typeof globalThis & {
  shelfSessions?: SessionStore;
};
const sessions = (globalStore.shelfSessions ??= new SessionStore());
export type SearchRequest = {
  message: string;
  branch?: string;
  action?: "search" | "branch" | "similar";
  selectedResultId?: string;
  session?: { id: string; revision: number };
};
export function validRequest(value: unknown): value is SearchRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (
    typeof v.message !== "string" ||
    !v.message.trim() ||
    v.message.length > 500
  )
    return false;
  if (
    v.branch !== undefined &&
    (typeof v.branch !== "string" ||
      !(v.branch === "" || /^[A-Za-z0-9_-]{1,10}$/.test(v.branch)))
  )
    return false;
  if (
    v.action !== undefined &&
    !["search", "branch", "similar"].includes(v.action as string)
  )
    return false;
  if (
    v.selectedResultId !== undefined &&
    (typeof v.selectedResultId !== "string" ||
      !v.selectedResultId ||
      v.selectedResultId.length > 1000)
  )
    return false;
  if (
    v.action === "similar" &&
    (typeof v.selectedResultId !== "string" || !v.session)
  )
    return false;
  if (v.session !== undefined) {
    if (!v.session || typeof v.session !== "object") return false;
    const s = v.session as Record<string, unknown>;
    if (
      typeof s.id !== "string" ||
      !/^[0-9a-f-]{36}$/.test(s.id) ||
      !Number.isSafeInteger(s.revision) ||
      Number(s.revision) < 1
    )
      return false;
  }
  return true;
}
async function dependencies(ai: boolean) {
  const mode = process.env.CATALOG_MODE ?? "mock";
  if (!["mock", "http-demo", "carlx", "koha"].includes(mode))
    throw Error("Unsupported catalog configuration");
  const dependencies = {
    // Local Koha can exceed fixture timings during cold starts; keep the deadline bounded.
    catalogTimeoutMs: mode === "koha" ? 6000 : undefined,
    catalog:
      mode === "koha"
        ? kohaFromEnvironment()
        : mode === "carlx"
          ? new CarlXProvider()
          : mode === "http-demo"
            ? new HttpDemoProvider(
                process.env.DEMO_CATALOG_URL || "http://127.0.0.1:4310",
              )
            : mockProvider,
    intelligence:
      ai && process.env.OPENAI_API_KEY
        ? new OpenAIIntelligence(
            process.env.OPENAI_API_KEY,
            process.env.OPENAI_MODEL || "gpt-4.1-mini",
          )
        : undefined,
  };
  const catalog: CatalogProvider = dependencies.catalog;
  const discovered = catalog.branches
    ? await catalog.branches(AbortSignal.timeout(6000))
    : configuredBranches;
  const branches = discovered.map((b) => ({
    ...b,
    name: configuredBranches.find((c) => c.id === b.id)?.name ?? b.name,
  }));
  return { ...dependencies, branches };
}
function diagnosticTrace(trace: DiscoveryTrace) {
  // Trace is opt-in local diagnostics, not a public administrator endpoint.
  // Remove request-derived text; actual structured query values remain available in engine tests.
  return {
    ...trace,
    query: "[request text omitted]",
    expandedQueries: [],
    queries: trace.queries.map((q) => ({
      ...q,
      query: {
        ...q.query,
        text: "[request text omitted]",
        cursor: q.query.cursor ? "[cursor omitted]" : undefined,
      },
    })),
  };
}
export async function search(request: SearchRequest) {
  const transaction = sessions.begin(
    request.session?.id,
    request.session?.revision,
  );
  try {
    const deps = await dependencies(true);
    if (request.branch && !deps.branches.some((b) => b.id === request.branch))
      throw new AccountError("Unknown catalog branch", 400);
    const result = await discover(
      { ...request, state: transaction.state },
      deps,
    );
    const session = transaction.commit(result.state);
    const { state: _, trace, ...response } = result;
    return {
      ...response,
      branches: deps.branches,
      circulationAvailable:
        process.env.CATALOG_MODE === "koha" &&
        Boolean(process.env.KOHA_CIRC_CLIENT_ID),
      notices:
        result.source === "koha"
          ? [
              ...result.notices,
              "Koha sandbox subjects come from MARC21 catalog headings. Genre coverage depends on cataloging; holdings are current sandbox observations, not reservations.",
            ]
          : result.notices,
      session,
      branch: result.state.preferences.branch ?? "",
      preferences: result.state.preferences,
      trace:
        process.env.SHELF_INSPECTOR === "1"
          ? diagnosticTrace(trace)
          : undefined,
    };
  } catch (error) {
    transaction.cancel();
    throw error;
  }
}
export async function conventionalSearch(message: string, branch: string) {
  const input: DiscoveryInput = { message, branch };
  const deps = await dependencies(false);
  if (branch && !deps.branches.some((b) => b.id === branch))
    throw new AccountError("Unknown catalog branch", 400);
  const { books, source, notices } = await discover(input, deps);
  return { books, source, notices, branches: deps.branches };
}
