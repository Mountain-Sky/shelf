import type {
  CatalogPage,
  CatalogProvider,
  CatalogQuery,
  CatalogRecord,
  Format,
  Holding,
  RecordRef,
} from "../types";

/** Read-only REST adapter for the pinned Koha sandbox; not a public-OPAC policy adapter. */
export type KohaOptions = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /** Shelf branch ID -> verified Koha library ID. No inferred aliases. */
  branchMap: Record<string, string>;
  /** Verified local Koha bibliographic item-type codes; unmapped codes stay unknown. */
  formatMap?: Record<string, Format>;
};
type ObjectValue = Record<string, unknown>;
function object(value: unknown): value is ObjectValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function id(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function string(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function totalCount(response: Response): number | undefined {
  const value = response.headers.get("x-total-count");
  if (value === null) return undefined;
  if (!value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw Error("Koha pagination metadata is missing or invalid.");
  return Number(value);
}
async function json(response: Response): Promise<unknown> {
  if (!response.ok) throw Error(`Koha request failed (${response.status}).`);
  if (
    !/^application\/(?:json|marc-in-json)(?:;|$)/.test(
      response.headers.get("content-type") ?? "",
    )
  )
    throw Error("Koha returned a non-JSON response.");
  const reader = response.body?.getReader();
  if (!reader) throw Error("Koha response is empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2 * 1024 * 1024) {
      await reader.cancel();
      throw Error("Koha response exceeds its size budget.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    // Parser errors can quote response fragments, including OAuth tokens.
    throw Error("Koha returned invalid JSON.");
  }
}
const blocked = new Set([
  "checked_out",
  "local_use",
  "in_transit",
  "lost",
  "withdrawn",
  "damaged",
  "not_for_loan",
  "on_hold",
  "recalled",
  "restricted",
  "in_bundle",
]);
function itemStatus(value: unknown): Holding["status"] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    !value.every(
      (s) => typeof s === "string" && (s === "available" || blocked.has(s)),
    )
  )
    return "unknown";
  return value.some((s) => blocked.has(s)) ? "unavailable" : "available";
}
export class KohaProvider implements CatalogProvider {
  readonly id = "koha";
  readonly kind = "catalog" as const;
  readonly capabilities: CatalogProvider["capabilities"] = {
    fields: ["keyword", "title", "author", "identifier", "subject", "browse"],
  };
  private readonly base: string;
  private token?: { value: string; expires: number };
  private tokenRequest?: Promise<string>;
  constructor(private readonly options: KohaOptions) {
    const url = new URL(options.baseUrl);
    if (
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && url.hostname === "127.0.0.1")) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !["/api/v1", "/api/v1/"].includes(url.pathname)
    )
      throw Error(
        "Koha requires an HTTPS /api/v1 URL (HTTP allowed only at 127.0.0.1 for a sandbox).",
      );
    if (!options.clientId || !options.clientSecret)
      throw Error("Koha OAuth credentials are required.");
    if (
      !Object.keys(options.branchMap).length ||
      Object.values(options.branchMap).some((v) => !v || v.length > 10)
    )
      throw Error("Configure verified Koha library mappings.");
    const formats: Format[] = [
      "print",
      "large-print",
      "audiobook",
      "ebook",
      "unknown",
    ];
    if (
      Object.values(options.formatMap ?? {}).some((v) => !formats.includes(v))
    )
      throw Error("Invalid Koha format mapping.");
    this.base = url.href.replace(/\/$/, "");
  }
  private async accessToken(signal: AbortSignal): Promise<string> {
    if (this.token && this.token.expires > Date.now()) return this.token.value;
    if (!this.tokenRequest) {
      this.tokenRequest = (async () => {
        const response = await fetch(`${this.base}/oauth/token`, {
          method: "POST",
          redirect: "error",
          signal,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.options.clientId,
            client_secret: this.options.clientSecret,
          }),
        });
        const data = await json(response);
        if (
          !object(data) ||
          typeof data.access_token !== "string" ||
          !data.access_token ||
          typeof data.token_type !== "string" ||
          data.token_type.toLowerCase() !== "bearer" ||
          typeof data.expires_in !== "number" ||
          !Number.isFinite(data.expires_in) ||
          data.expires_in <= 0
        )
          throw Error("Koha OAuth response is invalid.");
        this.token = {
          value: data.access_token,
          expires: Date.now() + Math.max(0, data.expires_in - 30) * 1000,
        };
        return data.access_token;
      })().finally(() => {
        this.tokenRequest = undefined;
      });
    }
    return this.tokenRequest;
  }
  private async get(
    path: string,
    signal: AbortSignal,
    embed?: string,
    accept = "application/json",
  ) {
    const token = await this.accessToken(signal);
    const response = await fetch(`${this.base}${path}`, {
      redirect: "error",
      signal,
      headers: {
        Accept: accept,
        Authorization: `Bearer ${token}`,
        ...(embed ? { "x-koha-embed": embed } : {}),
      },
    });
    if (response.status === 401) this.token = undefined;
    const data = await json(response);
    return { data, total: totalCount(response) };
  }
  private mapRecord(
    raw: unknown,
    observedAt: string,
  ): CatalogRecord | undefined {
    if (!object(raw) || !id(raw.biblio_id) || !string(raw.title))
      throw Error("Invalid Koha bibliographic record.");
    // Staff APIs may return suppressed records. Fail closed on absent visibility evidence.
    if (raw.opac_suppressed !== 0 && raw.opac_suppressed !== false)
      return undefined;
    const year =
      string(raw.publication_year) ??
      (typeof raw.copyright_date === "number"
        ? String(raw.copyright_date)
        : string(raw.copyright_date));
    const pages = string(raw.pages)?.match(
      /^(\d{1,5})(?:\s*(?:p\.?|pages?))?$/i,
    );
    return {
      ref: { provider: this.id, id: String(raw.biblio_id) },
      title: string(raw.title)!,
      contributors: string(raw.author)
        ? [{ name: string(raw.author)!, role: "author" }]
        : [],
      identifiers: string(raw.isbn)
        ? [{ scheme: "ISBN", value: string(raw.isbn)! }]
        : [],
      year: year && /^\d{4}$/.test(year) ? Number(year) : undefined,
      format: Object.hasOwn(
        this.options.formatMap ?? {},
        string(raw.item_type) ?? "",
      )
        ? this.options.formatMap![string(raw.item_type)!]
        : "unknown",
      extent:
        pages && Number(pages[1]) > 0 ? { pages: Number(pages[1]) } : undefined,
      subjects: [],
      summary: string(raw.abstract),
      series: string(raw.series_title)
        ? { title: string(raw.series_title)! }
        : undefined,
      provenance: { source: this.id, kind: this.kind, observedAt },
    };
  }
  async search(query: CatalogQuery, signal: AbortSignal): Promise<CatalogPage> {
    if (
      !this.capabilities.fields.includes(query.field) ||
      !Number.isInteger(query.limit) ||
      query.limit < 1 ||
      query.limit > 20 ||
      (query.field !== "browse" && !query.text.trim()) ||
      query.text.length > 500
    )
      throw Error("Unsupported Koha search.");
    const page = query.cursor === undefined ? 1 : Number(query.cursor);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100 ||
      (query.cursor !== undefined && String(page) !== query.cursor)
    )
      throw Error("Invalid Koha cursor.");
    const like = {
      "-like": `%${query.text.trim().replace(/[\\%_]/g, "\\$&")}%`,
    };
    const filter: ObjectValue = { opac_suppressed: 0 };
    if (query.field === "title" || query.field === "author")
      filter[query.field] = like;
    else if (query.field === "identifier") filter.isbn = like;
    else if (query.field === "subject") filter["metadata.metadata"] = like;
    else if (query.field === "keyword")
      filter["-and"] = query.text
        .trim()
        .split(/\s+/)
        .map((term) => {
          const match = { "-like": `%${term.replace(/[\\%_]/g, "\\$&")}%` };
          return {
            "-or": [
              { title: match },
              { author: match },
              { abstract: match },
              { "metadata.metadata": match },
            ],
          };
        });
    const params = new URLSearchParams({
      _page: String(page),
      _per_page: String(query.limit),
      _order_by: "+biblio_id",
      q: JSON.stringify(filter),
    });
    // MARC representation prefetches metadata in pinned Koha, permitting bounded
    // metadata candidate retrieval. Only parsed subject fields establish genre evidence.
    const { data, total } = await this.get(
      `/biblios?${params}`,
      signal,
      undefined,
      "application/marc-in-json",
    );
    if (
      !Array.isArray(data) ||
      data.length > query.limit ||
      (total !== undefined && total < data.length)
    )
      throw Error("Invalid Koha search page.");
    const metadata = new Map(
      data.map((raw) => {
        const parsed = parseKohaMarc(raw);
        return [parsed.id, parsed.subjects] as const;
      }),
    );
    if (metadata.size !== data.length)
      throw Error("Duplicate Koha MARC identity.");
    const observedAt = new Date().toISOString();
    let records: CatalogRecord[] = [];
    if (metadata.size) {
      // Recheck visibility using the normal bibliographic representation. Never join
      // records by list position or MARC 001, which is not Koha's internal identity.
      const details = new URLSearchParams({
        _per_page: String(query.limit),
        _order_by: "+biblio_id",
        q: JSON.stringify({
          opac_suppressed: 0,
          biblio_id: { "-in": [...metadata.keys()].map(Number) },
        }),
      });
      const response = await this.get(`/biblios?${details}`, signal);
      if (!Array.isArray(response.data) || response.data.length > query.limit)
        throw Error("Invalid Koha details.");
      const seen = new Set<string>();
      for (const raw of response.data) {
        const record = this.mapRecord(raw, observedAt);
        if (!record) continue;
        if (!metadata.has(record.ref.id) || seen.has(record.ref.id))
          throw Error("Mismatched Koha MARC identity.");
        seen.add(record.ref.id);
        record.subjects = metadata.get(record.ref.id)!;
        if (
          query.field !== "subject" ||
          record.subjects.some((s) => s.includes(query.text.toLowerCase()))
        )
          records.push(record);
      }
    }
    return {
      records,
      ...((total === undefined
        ? data.length === query.limit
        : page * query.limit < total) &&
      data.length &&
      page < 100
        ? { nextCursor: String(page + 1) }
        : {}),
    };
  }
  async holdings(
    records: RecordRef[],
    branches: string[],
    signal: AbortSignal,
  ): Promise<Holding[]> {
    if (
      records.length > 30 ||
      branches.length > 30 ||
      records.some((r) => r.provider !== this.id || !/^[1-9]\d*$/.test(r.id))
    )
      throw Error("Invalid Koha holdings request.");
    const output: Holding[][] = [];
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, records.length) }, async () => {
        while (next < records.length && !signal.aborted) {
          const index = next++;
          const ref = records[index];
          const observedAt = new Date().toISOString();
          let items: ObjectValue[] = [];
          let complete = false;
          try {
            let expected: number | undefined;
            const seen = new Set<number>();
            for (let page = 1; page <= 3; page++) {
              const params = new URLSearchParams({
                _page: String(page),
                _per_page: "100",
                _order_by: "+item_id",
              });
              const { data, total } = await this.get(
                `/biblios/${ref.id}/items?${params}`,
                signal,
                "_status",
              );
              if (
                total === undefined ||
                !Array.isArray(data) ||
                data.length > 100 ||
                (expected !== undefined && expected !== total)
              )
                throw Error("Koha holdings changed during pagination.");
              expected = total;
              for (const item of data) {
                if (
                  !object(item) ||
                  !id(item.item_id) ||
                  String(item.biblio_id) !== ref.id ||
                  seen.has(item.item_id) ||
                  !string(item.holding_library_id)
                )
                  throw Error("Invalid Koha item response.");
                seen.add(item.item_id);
                items.push(item);
              }
              if (items.length === total) {
                complete = true;
                break;
              }
              if (!data.length || items.length > total)
                throw Error("Incomplete Koha item response.");
            }
          } catch {
            items = [];
          }
          output[index] = branches.map((branch) => {
            const library = Object.hasOwn(this.options.branchMap, branch)
              ? this.options.branchMap[branch]
              : undefined;
            const statuses = items
              .filter((i) => i.holding_library_id === library)
              .map((i) => itemStatus(i._status));
            const unknown =
              !complete || !library || statuses.includes("unknown");
            const copies = unknown
              ? null
              : statuses.filter((s) => s === "available").length;
            return {
              record: ref,
              branch,
              copies,
              status:
                copies === null
                  ? "unknown"
                  : copies > 0
                    ? "available"
                    : "unavailable",
              observedAt,
              provenance: { source: this.id, kind: this.kind, observedAt },
            };
          });
        }
      }),
    );
    return output.flat();
  }
}

/** MARC21 only: retain catalog headings and add narrowly evidenced genre aliases. */
export function parseKohaMarc(raw: unknown): {
  id: string;
  subjects: string[];
} {
  if (!object(raw) || !Array.isArray(raw.fields))
    throw Error("Invalid Koha MARC record.");
  let recordId: string | undefined;
  const subjects = new Set<string>();
  for (const field of raw.fields) {
    if (!object(field)) throw Error("Invalid Koha MARC field.");
    for (const [tag, value] of Object.entries(field)) {
      if (!["999", "650", "651", "655"].includes(tag)) continue;
      if (!object(value) || !Array.isArray(value.subfields))
        throw Error("Invalid Koha MARC subfields.");
      const parts: string[] = [];
      for (const subfield of value.subfields) {
        if (!object(subfield)) throw Error("Invalid Koha MARC subfield.");
        for (const [code, text] of Object.entries(subfield)) {
          if (typeof text !== "string") throw Error("Invalid Koha MARC text.");
          if (tag === "999" && code === "c") {
            if (recordId || !/^[1-9]\d*$/.test(text))
              throw Error("Invalid Koha MARC identity.");
            recordId = text;
          } else if (
            tag !== "999" &&
            ["a", "v", "x", "y", "z"].includes(code)
          ) {
            const normalized = text
              .trim()
              .toLowerCase()
              .replace(/[.,;:]+$/, "");
            if (normalized) {
              parts.push(normalized);
              subjects.add(normalized);
            }
          }
        }
      }
      if (parts.length) subjects.add(parts.join(" — "));
      if (
        tag === "655" &&
        parts.some((p) =>
          /^(detective and mystery (stories|fiction)|mystery (stories|fiction))$/.test(
            p,
          ),
        )
      )
        subjects.add("mystery");
    }
  }
  if (!recordId) throw Error("Missing Koha MARC identity (999$c).");
  return { id: recordId, subjects: [...subjects] };
}
