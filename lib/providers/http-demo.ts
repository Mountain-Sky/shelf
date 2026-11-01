import type {
  CatalogPage,
  CatalogProvider,
  CatalogQuery,
  CatalogRecord,
  Holding,
  RecordRef,
} from "../types";

function record(value: unknown): value is CatalogRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as CatalogRecord;
  return (
    r.ref?.provider === "demo" &&
    typeof r.ref.id === "string" &&
    typeof r.title === "string" &&
    Array.isArray(r.contributors) &&
    r.contributors.every(
      (c) => typeof c?.name === "string" && typeof c.role === "string",
    ) &&
    Array.isArray(r.identifiers) &&
    r.identifiers.every(
      (i) => typeof i?.scheme === "string" && typeof i.value === "string",
    ) &&
    Array.isArray(r.subjects) &&
    r.subjects.every((s) => typeof s === "string") &&
    ["print", "large-print", "audiobook", "ebook", "unknown"].includes(
      r.format,
    ) &&
    (r.summary === undefined || typeof r.summary === "string") &&
    r.provenance?.kind === "fixture" &&
    typeof r.provenance.source === "string" &&
    Number.isFinite(Date.parse(r.provenance.observedAt))
  );
}
function holding(value: unknown): value is Holding {
  if (!value || typeof value !== "object") return false;
  const h = value as Holding;
  return (
    h.record?.provider === "demo" &&
    typeof h.record.id === "string" &&
    typeof h.branch === "string" &&
    ["available", "unavailable", "unknown"].includes(h.status) &&
    (h.copies === null || (Number.isInteger(h.copies) && h.copies >= 0)) &&
    Number.isFinite(Date.parse(h.observedAt)) &&
    h.provenance?.kind === "fixture" &&
    typeof h.provenance.source === "string"
  );
}

/** Independent loopback transport for the synthetic catalog; this is not a Koha adapter. */
export class HttpDemoProvider implements CatalogProvider {
  readonly id = "demo";
  readonly kind = "fixture" as const;
  readonly capabilities: CatalogProvider["capabilities"] = {
    fields: ["keyword", "title", "author", "identifier", "subject", "browse"],
  };
  private base: string;
  constructor(baseUrl = "http://127.0.0.1:4310") {
    const url = new URL(baseUrl);
    if (
      url.protocol !== "http:" ||
      url.hostname !== "127.0.0.1" ||
      url.username ||
      url.password ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        "The demo catalog must use an HTTP 127.0.0.1 loopback origin.",
      );
    }
    this.base = url.origin;
  }
  private async request(
    path: string,
    body: unknown,
    signal: AbortSignal,
  ): Promise<unknown> {
    const response = await fetch(`${this.base}${path}`, {
      method: "POST",
      redirect: "error",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok)
      throw new Error("The demo catalog service is unavailable.");
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new Error("Invalid demo catalog response.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty demo catalog response.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256 * 1024) {
        await reader.cancel();
        throw new Error("Demo catalog response exceeded its budget.");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  }
  async search(query: CatalogQuery, signal: AbortSignal): Promise<CatalogPage> {
    const result = (await this.request(
      "/search",
      query,
      signal,
    )) as CatalogPage;
    if (
      !result ||
      !Array.isArray(result.records) ||
      result.records.length > 20 ||
      !result.records.every(record) ||
      (result.nextCursor !== undefined && typeof result.nextCursor !== "string")
    )
      throw new Error("Invalid demo catalog search response.");
    return result;
  }
  async holdings(
    records: RecordRef[],
    branches: string[],
    signal: AbortSignal,
  ): Promise<Holding[]> {
    const result = await this.request(
      "/holdings",
      { records, branches },
      signal,
    );
    if (!Array.isArray(result) || result.length > 300 || !result.every(holding))
      throw new Error("Invalid demo catalog holdings response.");
    return result;
  }
}
