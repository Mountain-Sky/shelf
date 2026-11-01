import { NextRequest, NextResponse } from "next/server";
import { conventionalSearch } from "../../../../lib/application/discovery-service";
import { isBranch } from "../../../../lib/config/branches";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const branch = (req.nextUrl.searchParams.get("branch") ?? "").toUpperCase();
  if (!query || query.length > 500 || !isBranch(branch))
    return NextResponse.json(
      { error: "Invalid query or branch" },
      { status: 400 },
    );
  try {
    return NextResponse.json(await conventionalSearch(query, branch), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Catalog service unavailable" },
      { status: 503 },
    );
  }
}
