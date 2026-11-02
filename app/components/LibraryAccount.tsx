"use client";
import { useEffect, useRef, useState } from "react";
import type { CatalogBranch } from "../../lib/types";
import type { PatronAccount } from "../../lib/circulation";
import { X } from "lucide-react";
export function LibraryAccount({
  open,
  onClose,
  branches,
  target,
}: {
  open: boolean;
  onClose: () => void;
  branches: CatalogBranch[];
  target?: { id: string; title: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [account, setAccount] = useState<PatronAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [pickup, setPickup] = useState("");
  async function refresh() {
    const r = await fetch("/api/account", {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const data = await r.json();
    if (r.status === 401) {
      setAccount(null);
      return;
    }
    if (!r.ok) throw Error(data.error || "Account unavailable");
    setAccount(data);
  }
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      setNotice("");
      setPickup(branches[0]?.id ?? "");
      void refresh().catch((e) => setNotice(e.message));
    } else dialog.current?.close();
  }, [open]);
  async function act(body: Record<string, string>, success: string) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 401) setAccount(null);
        throw Error(data.error || "Account action failed");
      }
      await refresh();
      setNotice(success);
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Unable to confirm this action. Refresh your account before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="library-account"
      aria-labelledby="account-heading"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="dialog-heading">
        <h2 id="account-heading">Library account</h2>
        <button aria-label="Close library account" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <p>
        Local Koha sandbox · synthetic test accounts only. Account data stays
        separate from your browser reading list.
      </p>
      {notice && (
        <p role="status" className="account-notice">
          {notice}
        </p>
      )}
      {!account ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void act(
              {
                action: "login",
                username: String(f.get("username")),
                password: String(f.get("password")),
              },
              "Signed in.",
            );
            e.currentTarget.reset();
          }}
        >
          <label>
            Library username
            <input
              name="username"
              autoComplete="username"
              required
              maxLength={100}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </label>
          <button className="secondary-button" disabled={busy}>
            Sign in
          </button>
        </form>
      ) : (
        <>
          <div className="account-actions">
            <strong>Signed in as {account.patron.username}</strong>
            <button
              disabled={busy}
              onClick={() => void act({ action: "logout" }, "Signed out.")}
            >
              Sign out
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void refresh()
                  .catch((e) => setNotice(e.message))
                  .finally(() => setBusy(false));
              }}
            >
              Refresh account
            </button>
          </div>
          {target && (
            <section className="hold-request">
              <h3>Request this title</h3>
              <p>{target.title}</p>
              <label>
                Pickup branch
                <select
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Koha checks borrowing rules. A placed hold is a request, not a
                promise of pickup tomorrow.
              </p>
              <button
                className="secondary-button"
                disabled={
                  busy ||
                  !pickup ||
                  account.holds.some((h) => h.recordId === target.id)
                }
                onClick={() =>
                  void act(
                    { action: "hold", recordId: target.id, branch: pickup },
                    "Hold placed in Koha. Wait for a ready-for-pickup notification before visiting.",
                  )
                }
              >
                Place hold
              </button>
            </section>
          )}
          <h3>Loans ({account.loans.length})</h3>
          {!account.loans.length && <p>No current loans.</p>}
          <ul>
            {account.loans.map((l) => (
              <li key={l.id}>
                <strong>{l.title}</strong>
                <span>
                  Due {new Date(l.due).toLocaleDateString()} · {l.renewals}{" "}
                  {l.renewals === 1 ? "renewal" : "renewals"}
                </span>
                <button
                  disabled={busy}
                  aria-label={`Renew ${l.title}`}
                  onClick={() =>
                    void act(
                      { action: "renew", loanId: l.id },
                      "Renewal confirmed by Koha. The due date is refreshed below.",
                    )
                  }
                >
                  Renew loan
                </button>
              </li>
            ))}
          </ul>
          <h3>Holds ({account.holds.length})</h3>
          {!account.holds.length && <p>No active holds.</p>}
          <ul>
            {account.holds.map((h) => (
              <li key={h.id}>
                <strong>{h.title}</strong>
                <span>
                  {h.status} ·{" "}
                  {branches.find((b) => b.id === h.pickupBranch)?.name ??
                    h.pickupBranch}
                </span>
                <button
                  disabled={busy}
                  aria-label={`Cancel hold for ${h.title}`}
                  onClick={() =>
                    void act(
                      { action: "cancel", holdId: h.id },
                      "Hold cancellation confirmed by Koha.",
                    )
                  }
                >
                  Cancel hold
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </dialog>
  );
}
