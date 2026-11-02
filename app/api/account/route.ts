import { NextRequest, NextResponse } from "next/server";
import { AccountError } from "../../../lib/circulation";
import { circulationProvider as provider } from "../../../lib/application/circulation-service";
import {
  createPatronSession,
  patronSession,
  endPatronSession,
  loginAttempt,
} from "../../../lib/application/patron-sessions";
export const runtime = "nodejs";
const cookie = "shelf_patron";
function response(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function failure(e: unknown) {
  return response(
    {
      error:
        e instanceof AccountError
          ? e.message
          : "Account service unavailable. Refresh your account before retrying an action.",
    },
    e instanceof AccountError ? e.status : 503,
  );
}
export async function GET(req: NextRequest) {
  try {
    const p = provider();
    const s = patronSession(req.cookies.get(cookie)?.value);
    return response(await p.account(s.patron));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const expected =
      process.env.SHELF_PUBLIC_ORIGIN ||
      `${req.nextUrl.protocol}//${req.headers.get("host") ?? req.nextUrl.host}`;
    if (
      req.headers.get("origin") !== expected ||
      !req.headers.get("content-type")?.startsWith("application/json")
    )
      return response({ error: "Same-origin JSON request required" }, 403);
    const reader = req.body?.getReader();
    let text = "";
    let size = 0;
    const decoder = new TextDecoder();
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 4096) {
          await reader.cancel();
          return response({ error: "Request too large" }, 413);
        }
        text += decoder.decode(value, { stream: true });
      }
    let body: any;
    try {
      body = JSON.parse(text + decoder.decode());
    } catch {
      return response({ error: "Invalid request" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return response({ error: "Invalid request" }, 400);
    const token = req.cookies.get(cookie)?.value;
    if (body.action === "logout") {
      endPatronSession(token);
      const r = response({ ok: true });
      r.cookies.set(cookie, "", {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        maxAge: 0,
      });
      return r;
    }
    const p = provider();
    if (body.action === "login") {
      if (
        typeof body.username !== "string" ||
        !body.username.trim() ||
        body.username.length > 100 ||
        typeof body.password !== "string" ||
        !body.password ||
        body.password.length > 200
      )
        return response({ error: "Enter your username and password" }, 400);
      loginAttempt();
      const patron = await p.authenticate(body.username, body.password);
      endPatronSession(token);
      const r = response({ ok: true });
      r.cookies.set(cookie, createPatronSession(patron), {
        httpOnly: true,
        sameSite: "strict",
        secure: req.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 1800,
      });
      return r;
    }
    const s = patronSession(token);
    if (s.busy)
      return response(
        { error: "An account action is already in progress" },
        409,
      );
    s.busy = true;
    try {
      if (
        body.action === "hold" &&
        typeof body.recordId === "string" &&
        typeof body.branch === "string"
      )
        await p.placeHold(s.patron, body.recordId, body.branch);
      else if (body.action === "cancel" && typeof body.holdId === "string")
        await p.cancelHold(s.patron, body.holdId);
      else if (body.action === "renew" && typeof body.loanId === "string")
        await p.renew(s.patron, body.loanId);
      else return response({ error: "Invalid account action" }, 400);
      return response({ ok: true });
    } finally {
      s.busy = false;
    }
  } catch (e) {
    return failure(e);
  }
}
