import { NextRequest, NextResponse } from "next/server";
import { authorizeDemo } from "./lib/application/access";

/** Private demo gate, not a patron authentication system. Terminate TLS at the host. */
export function proxy(request: NextRequest) {
  const result = authorizeDemo(request.headers.get("authorization"), {
    private:
      process.env.SHELF_ACCESS === "private" ||
      Boolean(process.env.DEMO_ACCESS_PASSWORD),
    password: process.env.DEMO_ACCESS_PASSWORD,
  });
  if (result === "allowed") return NextResponse.next();
  if (result === "unconfigured")
    return new NextResponse("Private demo access is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  return new NextResponse("This Shelf demo is for invited reviewers.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Shelf private demo", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}
export const config = { matcher: ["/:path*"] };
