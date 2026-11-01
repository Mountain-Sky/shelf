/** Provider-neutral domain contracts. No HTTP, model SDK, or ILS imports. */
export type Intent =
  "known_item" | "recommendation" | "availability" | "exploration";
export type Format =
  "print" | "large-print" | "audiobook" | "ebook" | "unknown";
export type RecordRef = { provider: string; id: string };
export type Provenance = {
  source: string;
  kind: "fixture" | "catalog" | "enrichment";
  observedAt: string;
};
export type CatalogRecord = {
  ref: RecordRef;
  title: string;
  contributors: { name: string; role: string }[];
  identifiers: { scheme: string; value: string }[];
  year?: number;
  format: Format;
  language?: string;
  extent?: { pages?: number; minutes?: number };
  subjects: string[];
  summary?: string;
  series?: { title: string; volume?: string };
  /** Only set when the provider supplies a trusted grouping relationship. */
  work?: { source: string; id: string };
  provenance: Provenance;
  catalogUrl?: string;
};
export type Holding = {
  record: RecordRef;
  branch: string;
  status: "available" | "unavailable" | "unknown";
  copies: number | null;
  observedAt: string;
  provenance: Provenance;
};
/** Item-level data is optional: aggregate holdings remain a supported contract. */
export type CatalogItem = {
  ref: RecordRef;
  record: RecordRef;
  branch: string;
  status: Holding["status"];
  observedAt: string;
};
export type CatalogQuery = {
  field: "keyword" | "title" | "author" | "identifier" | "subject" | "browse";
  text: string;
  limit: number;
  cursor?: string;
};
export type CatalogPage = { records: CatalogRecord[]; nextCursor?: string };
export interface CatalogProvider {
  readonly id: string;
  readonly kind: "fixture" | "catalog";
  readonly capabilities: { fields: CatalogQuery["field"][] };
  search(query: CatalogQuery, signal: AbortSignal): Promise<CatalogPage>;
  holdings(
    records: RecordRef[],
    branches: string[],
    signal: AbortSignal,
  ): Promise<Holding[]>;
}
export type Preferences = {
  branch?: string;
  availability: "any" | "prefer" | "only";
  format?: Format;
  maxPages?: number;
  requiredSubjects: string[];
  excludedSubjects: string[];
};
export type SnapshotEntry = {
  id: string;
  recordIds: string[];
  title: string;
  subjects: string[];
  pages?: number;
};
export type SessionState = {
  seedResultId?: string;
  goal: string;
  terms: string[];
  preferences: Preferences;
  snapshot: SnapshotEntry[];
};
export type DiscoveryInput = {
  message: string;
  branch?: string;
  action?: "search" | "branch" | "similar";
  selectedResultId?: string;
  state?: SessionState;
};
export type Plan = {
  browse?: boolean;
  seedTitle?: string;
  intent: Intent;
  query: string;
  expandedQueries: string[];
  constraints: string[];
  refinement: boolean;
  preferences: Preferences;
  queries: CatalogQuery[];
  clarification?: string;
  excludeResultId?: string;
};
export type Evidence = {
  recordId: string;
  field: "title" | "contributors" | "subjects" | "summary";
  value: string;
};
export type Ranked = {
  record: CatalogRecord;
  score: number;
  evidence: Evidence[];
  reasons: string[];
};
export type ResultEdition = {
  record: CatalogRecord;
  availability: Holding[];
  score: number;
  evidence: Evidence[];
};
/** A presentation group retains all its authoritative source records. */
export type ResultBook = {
  id: string;
  selectedRecordId: string;
  title: string;
  author: string;
  year?: number;
  format: string;
  subjects: string[];
  summary: string;
  catalogUrl?: string;
  availability: {
    branch: string;
    status: Holding["status"];
    copies: number | null;
    source: string;
    observedAt: string;
  }[];
  editions: ResultEdition[];
  evidence: Evidence[];
};
export type ModelCall = {
  stage: "interpretation" | "assessment";
  status: "disabled" | "success" | "fallback";
  durationMs: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
};
export type Interpretation = { intent: Intent; terms: string[] };
export type Assessment = { recordId: string; evidence: Evidence[] }[];
/** Models propose; the engine validates and owns execution and constraints. */
export interface Intelligence {
  readonly model: string;
  interpret(
    message: string,
    state: { goal: string; terms: string[] },
    signal: AbortSignal,
  ): Promise<Interpretation>;
  assess(
    query: string,
    candidates: CatalogRecord[],
    signal: AbortSignal,
  ): Promise<Assessment>;
}
export interface MetadataEnricher {
  enrich(
    records: CatalogRecord[],
    signal: AbortSignal,
  ): Promise<
    { record: RecordRef; subjects: string[]; provenance: Provenance }[]
  >;
}
export type DiscoveryTrace = {
  intent: Intent;
  query: string;
  expandedQueries: string[];
  constraints: string[];
  candidateCount: number;
  candidates: { id: string; title: string }[];
  queries: {
    query: CatalogQuery;
    status: "success" | "failed";
    count: number;
  }[];
  grouping: {
    groupId: string;
    recordIds: string[];
    basis: "provider-work" | "record";
  }[];
  ranked: { id: string; title: string; score: number; reasons: string[] }[];
  availability: { recordId: string; branch: string; status: string }[];
  stagesMs: Record<string, number>;
  modelCalls: ModelCall[];
  notes: string[];
};
export type DiscoveryResult = {
  books: ResultBook[];
  reply: string;
  source: string;
  notices: string[];
  clarification?: string;
  suggestedActions: string[];
  state: SessionState;
  trace: DiscoveryTrace;
};
export function recordKey(ref: RecordRef): string {
  return JSON.stringify([ref.provider, ref.id]);
}

/** Stable presentation identity only when an adapter supplies a trusted work relation. */
export function groupKey(record: CatalogRecord): string {
  return record.work
    ? JSON.stringify(["work", record.work.source, record.work.id])
    : recordKey(record.ref);
}
