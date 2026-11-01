import { randomUUID } from "node:crypto";
import type { SessionState } from "../types";
type Entry = {
  state?: SessionState;
  revision: number;
  expires: number;
  busy: boolean;
  timer?: ReturnType<typeof setTimeout>;
};
export class SessionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
/** Single-process local prototype. No durable histories or cross-worker promises. */
export class SessionStore {
  private entries = new Map<string, Entry>();
  constructor(
    private ttlMs = 30 * 60 * 1000,
    private capacity = 100,
    private now = Date.now,
  ) {}
  private expire(key: string, entry: Entry) {
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(
      () => {
        if (this.entries.get(key) !== entry) return;
        if (entry.busy || entry.expires > this.now()) this.expire(key, entry);
        else this.entries.delete(key);
      },
      Math.max(entry.busy ? 1000 : 1, entry.expires - this.now()),
    );
    entry.timer.unref();
  }
  begin(id?: string, revision?: number) {
    const now = this.now();
    for (const [key, value] of this.entries)
      if (value.expires <= now && !value.busy) {
        if (value.timer) clearTimeout(value.timer);
        this.entries.delete(key);
      }
    const existing = id ? this.entries.get(id) : undefined;
    if (id && !existing)
      throw new SessionError(410, "Session expired. Start a new search.");
    if (existing && (existing.busy || revision !== existing.revision))
      throw new SessionError(
        409,
        "Results changed. Retry using the latest search.",
      );
    if (!existing && this.entries.size >= this.capacity)
      throw new SessionError(
        503,
        "Too many active discovery sessions. Try again later.",
      );
    const key = id ?? randomUUID();
    const entry: Entry = existing ?? {
      revision: 0,
      expires: now + this.ttlMs,
      busy: false,
    };
    entry.busy = true;
    this.entries.set(key, entry);
    this.expire(key, entry);
    return {
      id: key,
      state: entry.state ? structuredClone(entry.state) : undefined,
      commit: (state: SessionState) => {
        entry.state = structuredClone(state);
        entry.revision++;
        entry.expires = this.now() + this.ttlMs;
        entry.busy = false;
        this.expire(key, entry);
        return { id: key, revision: entry.revision };
      },
      cancel: () => {
        entry.busy = false;
        if (!existing) {
          if (entry.timer) clearTimeout(entry.timer);
          this.entries.delete(key);
        }
      },
    };
  }
}
