import { randomBytes } from "node:crypto";
import { AccountError, type PatronIdentity } from "../circulation";
type Session = { patron: PatronIdentity; expires: number; busy: boolean };
const sessions = new Map<string, Session>();
export function createPatronSession(patron: PatronIdentity) {
  for (const [key, s] of sessions)
    if (s.expires < Date.now()) sessions.delete(key);
  if (sessions.size >= 100)
    throw new AccountError("Too many local account sessions", 503);
  const token = randomBytes(32).toString("hex");
  sessions.set(token, {
    patron,
    expires: Date.now() + 30 * 60 * 1000,
    busy: false,
  });
  return token;
}
export function patronSession(token: string | undefined) {
  const s = token ? sessions.get(token) : undefined;
  if (!s || s.expires < Date.now()) {
    if (token) sessions.delete(token);
    throw new AccountError("Sign in to your library account", 401);
  }
  return s;
}
export function endPatronSession(token: string | undefined) {
  if (token) sessions.delete(token);
}
const attempts = new Map<string, { count: number; until: number }>();
export function loginAttempt() {
  // This application is loopback-only; a global limit avoids trusting forwarded IP headers.
  const key = "local";
  const old = attempts.get(key);
  const value =
    old && old.until > Date.now()
      ? old
      : { count: 0, until: Date.now() + 60000 };
  value.count++;
  attempts.set(key, value);
  if (value.count > 10)
    throw new AccountError("Too many sign-in attempts. Wait one minute.", 429);
}
