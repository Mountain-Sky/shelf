import { NextRequest, NextResponse } from "next/server";
import { discover } from "../../../../lib/discovery";
import type { Branch } from "../../../../lib/types";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const branch = (req.nextUrl.searchParams.get("branch") ?? "").toUpperCase();
  if (
    !query ||
    query.length > 500 ||
    !["", "ASH", "RUST", "PUR"].includes(branch)
  )
    return NextResponse.json(
      { error: "Invalid query or branch" },
      { status: 400 },
    );
  try {
    const { books, source } = await discover(query, branch as Branch);
    return NextResponse.json(
      { books, source },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Catalog service unavailable" },
      { status: 503 },
    );
  }
}
