import { search, validRequest, conventionalSearch } from "./discovery-service";
import { SessionError } from "./sessions";
import { isBranch } from "../config/branches";

/** Standard Web Request handlers, shared by Express and the existing contract tests. */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(req.url);
      const expected = process.env.SHELF_PUBLIC_ORIGIN ||
        `${url.protocol}//${req.headers.get("host") ?? url.host}`;
      if (new URL(origin).origin !== expected)
        return Response.json({ error: "Cross-origin requests are not allowed" }, { status: 403 });
    } catch {
      return Response.json({ error: "Cross-origin requests are not allowed" }, { status: 403 });
    }
  }
  try {
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8000) {
        await reader.cancel();
        return Response.json({ error: "Request too large" }, { status: 413 });
      }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!validRequest(body))
      return Response.json({ error: "Invalid request" }, { status: 400 });
    return Response.json(await search(body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({
      error: error instanceof SessionError ? error.message : "Discovery is unavailable. Please try again.",
    }, { status: error instanceof SessionError ? error.status : 503 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const branch = (url.searchParams.get("branch") ?? "").toUpperCase();
  if (!query || query.length > 500 || !isBranch(branch))
    return Response.json({ error: "Invalid query or branch" }, { status: 400 });
  try {
    return Response.json(await conventionalSearch(query, branch), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Catalog service unavailable" }, { status: 503 });
  }
}
