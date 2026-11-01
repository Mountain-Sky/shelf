import { NextRequest, NextResponse } from "next/server";
import {
  search,
  validRequest,
} from "../../../lib/application/discovery-service";
import { SessionError } from "../../../lib/application/sessions";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  let allowedOrigin = true;
  if (origin) {
    try {
      const parsed = new URL(origin);
      allowedOrigin =
        parsed.origin ===
        (process.env.SHELF_PUBLIC_ORIGIN ||
          `${req.nextUrl.protocol}//${req.headers.get("host") ?? req.nextUrl.host}`);
    } catch {
      allowedOrigin = false;
    }
  }
  if (!allowedOrigin)
    return NextResponse.json(
      { error: "Cross-origin requests are not allowed" },
      { status: 403 },
    );
  try {
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8000) {
          await reader.cancel();
          return NextResponse.json(
            { error: "Request too large" },
            { status: 413 },
          );
        }
        chunks.push(value);
      }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!validRequest(body))
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    return NextResponse.json(await search(body), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof SessionError
            ? error.message
            : "Discovery is unavailable. Please try again.",
      },
      { status: error instanceof SessionError ? error.status : 503 },
    );
  }
}
