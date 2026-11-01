import type { IncomingMessage, ServerResponse } from "node:http";
import { authorizeDemo } from "./access.ts";

/** Preserve the original optional reviewer gate on both pages and API routes. */
export function demoGate(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const result = authorizeDemo(req.headers.authorization ?? null, {
    private: process.env.SHELF_ACCESS === "private" || Boolean(process.env.DEMO_ACCESS_PASSWORD),
    password: process.env.DEMO_ACCESS_PASSWORD,
  });
  if (result === "allowed") {
    next();
    return;
  }
  res.statusCode = result === "unconfigured" ? 503 : 401;
  res.setHeader("Cache-Control", "no-store");
  if (result === "unauthorized")
    res.setHeader("WWW-Authenticate", 'Basic realm="Shelf private demo", charset="UTF-8"');
  res.end(result === "unconfigured"
    ? "Private demo access is not configured."
    : "This Shelf demo is for invited reviewers.");
}
