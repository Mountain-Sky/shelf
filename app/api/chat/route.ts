import { NextRequest, NextResponse } from "next/server";
import { discover } from "../../../lib/discovery";
import type { Branch } from "../../../lib/types";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
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
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object")
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const {
      message,
      previousQuery = "",
      branch = "",
    } = body as Record<string, unknown>;
    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 500 ||
      typeof previousQuery !== "string" ||
      previousQuery.length > 1000 ||
      typeof branch !== "string" ||
      !["", "ASH", "RUST", "PUR"].includes(branch)
    )
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const result = await discover(
      message.trim(),
      branch as Branch,
      previousQuery,
      {
        ai: {
          key: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL,
        },
      },
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Discovery is unavailable. Please try again." },
      { status: 503 },
    );
  }
}
