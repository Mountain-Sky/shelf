import { NextRequest, NextResponse } from "next/server";
import { conventionalSearch } from "../../../../lib/application/discovery-service";
import {
  RequestError,
  CatalogConfigurationError,
} from "../../../../lib/application/errors";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const branch = (req.nextUrl.searchParams.get("branch") ?? "").toUpperCase();
  if (
    !query ||
    query.length > 500 ||
    !(branch === "" || /^[A-Za-z0-9_-]{1,10}$/.test(branch))
  )
    return NextResponse.json(
      { error: "Invalid query or branch" },
      { status: 400 },
    );
  try {
    return NextResponse.json(await conventionalSearch(query, branch), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof CatalogConfigurationError
            ? error.message
            : "Catalog service unavailable",
      },
      { status: error instanceof RequestError ? error.status : 503 },
    );
  }
}
