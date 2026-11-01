import { discover } from "../engine/discovery";
import { mockProvider } from "../providers/mock";
import { CarlXProvider } from "../providers/carlx";
import { OpenAIIntelligence } from "../ai/openai";
import { SessionStore } from "./sessions";
import type { DiscoveryInput, DiscoveryTrace } from "../types";
import { isBranch } from "../config/branches";
// Shared through development reloads; process-local and deliberately ephemeral.
const globalStore = globalThis as typeof globalThis & {
  shelfSessions?: SessionStore;
};
const sessions = (globalStore.shelfSessions ??= new SessionStore());
export type SearchRequest = {
  message: string;
  branch?: string;
  action?: "search" | "branch";
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
    (typeof v.branch !== "string" || !isBranch(v.branch))
  )
    return false;
  if (
    v.action !== undefined &&
    !["search", "branch"].includes(v.action as string)
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
function dependencies(ai: boolean) {
  const mode = process.env.CATALOG_MODE ?? "mock";
  if (!["mock", "carlx"].includes(mode))
    throw Error("Unsupported catalog configuration");
  return {
    catalog: mode === "carlx" ? new CarlXProvider() : mockProvider,
    intelligence:
      ai && process.env.OPENAI_API_KEY
        ? new OpenAIIntelligence(
            process.env.OPENAI_API_KEY,
            process.env.OPENAI_MODEL || "gpt-4.1-mini",
          )
        : undefined,
  };
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
    const result = await discover(
      { ...request, state: transaction.state },
      dependencies(true),
    );
    const session = transaction.commit(result.state);
    const { state: _, trace, ...response } = result;
    return {
      ...response,
      session,
      branch: result.state.preferences.branch ?? "",
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
  const { books, source, notices } = await discover(input, dependencies(false));
  return { books, source, notices };
}
