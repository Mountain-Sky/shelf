import type { Branch, CatalogProvider, DiscoveryTrace } from "./types";
import { mockProvider } from "./providers/mock";
import { CarlXProvider } from "./providers/carlx";
import { planDiscovery } from "./engine/planning";
import { rankBooks } from "./engine/ranking";
import { resolveAvailability } from "./engine/availability";
import { respond } from "./engine/response";
export type { DiscoveryTrace } from "./types";
export async function discover(
  message: string,
  branch: Branch,
  previousQuery = "",
  options: {
    provider?: CatalogProvider;
    ai?: Parameters<typeof respond>[2];
  } = {},
) {
  const provider =
    options.provider ??
    (process.env.CATALOG_MODE === "carlx" ? new CarlXProvider() : mockProvider);
  const stagesMs: Record<string, number> = {};
  const start = performance.now();
  let last = start;
  const mark = (stage: string) => {
    const now = performance.now();
    stagesMs[stage] = Math.round((now - last) * 100) / 100;
    last = now;
  };
  const plan = planDiscovery(message, branch, previousQuery);
  mark("planning");
  const candidates = await provider.search(plan);
  mark("retrieval");
  const ranked = rankBooks(candidates, plan);
  mark("ranking");
  const books = await resolveAvailability(ranked, provider, branch);
  mark("availability");
  const response = await respond(books, plan.query, options.ai ?? {});
  mark("response");
  stagesMs.total = Math.round((performance.now() - start) * 100) / 100;
  const trace: DiscoveryTrace = {
    ...plan,
    catalogMode: provider.mode,
    candidateCount: candidates.length,
    candidates: candidates.map((b) => ({ id: b.id, title: b.title })),
    ranked: ranked.map((r) => ({
      id: r.book.id,
      title: r.book.title,
      score: r.score,
      reasons: r.reasons,
    })),
    stagesMs,
    modelCalls: [response.call],
    notes: [
      provider.mode === "demo"
        ? "Demo records; all branch counts are synthetic."
        : "Provider-supplied records.",
      "Ranking is deterministic; optional AI selects only verified candidate IDs.",
    ],
  };
  return { books, trace, reply: response.reply, source: provider.mode };
}
