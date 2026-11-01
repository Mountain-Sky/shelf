export type Branch = "" | "ASH" | "RUST" | "PUR";
export type Book = {
  id: string;
  title: string;
  author: string;
  year?: number;
  format: string;
  subjects: string[];
  summary: string;
  branches: Record<string, number>;
  catalogUrl?: string;
};
export type Intent =
  "known_item" | "recommendation" | "availability" | "exploration";
export type Plan = {
  intent: Intent;
  query: string;
  expandedQueries: string[];
  constraints: string[];
  refinement: boolean;
  branch: Branch;
};
export type Availability = {
  branch: string;
  status: "available" | "unavailable" | "unknown";
  copies: number | null;
  source: "demo" | "carlx";
};
export type ResultBook = Book & { availability: Availability[] };
export type Ranked = { book: Book; score: number; reasons: string[] };
export type ModelCall = {
  status: "disabled" | "success" | "fallback";
  model?: string;
  durationMs: number;
};
export interface CatalogProvider {
  readonly mode: "demo" | "carlx";
  search(plan: Plan): Promise<Book[]>;
  availability(
    books: Book[],
    branch: Branch,
  ): Promise<Record<string, Availability[]>>;
}
export type DiscoveryTrace = Plan & {
  catalogMode: "demo" | "carlx";
  candidateCount: number;
  candidates: { id: string; title: string }[];
  ranked: { id: string; title: string; score: number; reasons: string[] }[];
  stagesMs: Record<string, number>;
  modelCalls: ModelCall[];
  notes: string[];
};
