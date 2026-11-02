import {
  AccountError,
  type CirculationProvider,
  type PatronIdentity,
  type PatronAccount,
} from "../circulation";
import { KohaProvider } from "./koha";
type Row = Record<string, any>;
const numeric = (value: string) => /^[1-9]\d*$/.test(value);
/** Explicitly restricted to allowlisted synthetic patrons in the isolated Koha sandbox. */
export class KohaCirculation implements CirculationProvider {
  private token?: { value: string; until: number };
  constructor(
    private options: {
      baseUrl: string;
      clientId: string;
      clientSecret: string;
      patronIds: string[];
    },
  ) {
    // Reuse the catalog origin validation without giving that reader circulation permissions.
    new KohaProvider({ ...options, branchMap: { TEST: "TEST" } });
    if (
      !options.patronIds.length ||
      options.patronIds.some((id) => !numeric(id))
    )
      throw Error("Synthetic patron allowlist required");
  }
  private async request(
    path: string,
    method = "GET",
    body?: unknown,
    embed?: string,
  ): Promise<any> {
    const signal = AbortSignal.timeout(10000);
    if (!this.token || this.token.until < Date.now()) {
      const r = await fetch(this.options.baseUrl + "/oauth/token", {
        method: "POST",
        redirect: "error",
        signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.options.clientId,
          client_secret: this.options.clientSecret,
        }),
      });
      const t = await this.decode(r);
      if (
        typeof t.access_token !== "string" ||
        typeof t.expires_in !== "number"
      )
        throw new AccountError("Account service unavailable", 503);
      this.token = {
        value: t.access_token,
        until: Date.now() + Math.max(0, t.expires_in - 30) * 1000,
      };
    }
    const r = await fetch(this.options.baseUrl + path, {
      method,
      redirect: "error",
      signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.token.value}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(embed ? { "x-koha-embed": embed } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401) this.token = undefined;
    if (r.status === 204) return null;
    return this.decode(r);
  }
  private async decode(r: Response) {
    const reader = r.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (!reader) throw new AccountError("Account service unavailable", 503);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024) {
        await reader.cancel();
        throw new AccountError("Account response too large", 503);
      }
      chunks.push(value);
    }
    if (!r.ok)
      throw new AccountError(
        r.status === 403 || r.status === 400 || r.status === 409
          ? "Koha did not allow this action. Check the account, borrowing rules, or pickup branch; no override was applied."
          : "Account service unavailable",
        r.status === 403 || r.status === 400 || r.status === 409 ? 409 : 503,
      );
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new AccountError("Invalid account service response", 503);
    }
  }
  private check(patron: PatronIdentity) {
    if (!this.options.patronIds.includes(patron.id))
      throw new AccountError(
        "Only the configured synthetic test accounts are enabled.",
        403,
      );
  }
  async authenticate(
    username: string,
    password: string,
  ): Promise<PatronIdentity> {
    let result: Row;
    try {
      result = await this.request("/auth/password/validation", "POST", {
        identifier: username,
        password,
      });
    } catch {
      throw new AccountError(
        "Sign-in failed. Check your test account credentials.",
        401,
      );
    }
    const patron = {
      id: String(result.patron_id),
      username: String(result.userid),
    };
    this.check(patron);
    return patron;
  }
  private async list(
    path: string,
    patron: PatronIdentity,
    embed?: string,
  ): Promise<Row[]> {
    this.check(patron);
    const rows: Row[] = [];
    for (let page = 1; page <= 5; page++) {
      const data = await this.request(
        `${path}?patron_id=${patron.id}&_per_page=100&_page=${page}`,
        "GET",
        undefined,
        embed,
      );
      if (
        !Array.isArray(data) ||
        data.length > 100 ||
        data.some((r) => !r || String(r.patron_id) !== patron.id)
      )
        throw new AccountError("Account ownership could not be verified", 503);
      rows.push(...data);
      if (data.length < 100) return rows;
    }
    throw new AccountError("Account exceeds the sandbox listing limit", 503);
  }
  private async title(id: string): Promise<string> {
    if (!numeric(id)) return "Catalog title unavailable";
    const b = await this.request(`/biblios/${id}`);
    return typeof b.title === "string" ? b.title : "Catalog title unavailable";
  }
  async account(patron: PatronIdentity): Promise<PatronAccount> {
    const [loans, holds] = await Promise.all([
      this.list("/checkouts", patron, "item.biblio"),
      this.list("/holds", patron),
    ]);
    if (
      loans.some(
        (l) =>
          !numeric(String(l.checkout_id)) ||
          typeof l.due_date !== "string" ||
          !Number.isFinite(Date.parse(l.due_date)),
      ) ||
      holds.some(
        (h) =>
          !numeric(String(h.hold_id)) ||
          !numeric(String(h.biblio_id)) ||
          typeof h.pickup_library_id !== "string",
      )
    )
      throw new AccountError("Invalid account service response", 503);
    return {
      patron,
      loans: loans.map((l) => ({
        id: String(l.checkout_id),
        title: l.item?.biblio?.title || `Item ${l.item_id}`,
        due: l.due_date,
        renewals: l.renewals_count ?? 0,
      })),
      holds: await Promise.all(
        holds.map(async (h) => ({
          id: String(h.hold_id),
          recordId: String(h.biblio_id),
          title: await this.title(String(h.biblio_id)),
          pickupBranch: h.pickup_library_id,
          status:
            h.status === "W"
              ? "Ready for pickup"
              : h.status === "T"
                ? "In transit"
                : "Requested — not ready for pickup",
        })),
      ),
    };
  }
  async placeHold(patron: PatronIdentity, recordId: string, branch: string) {
    this.check(patron);
    if (!numeric(recordId) || !/^[A-Za-z0-9_-]{1,10}$/.test(branch))
      throw new AccountError("Invalid title or pickup branch");
    const b = await this.request(`/biblios/${recordId}`);
    if (b.opac_suppressed !== 0 && b.opac_suppressed !== false)
      throw new AccountError("This record is not available for discovery");
    const holds = await this.list("/holds", patron);
    if (holds.some((h) => String(h.biblio_id) === recordId))
      throw new AccountError("You already have a hold on this title", 409);
    await this.request("/holds", "POST", {
      patron_id: Number(patron.id),
      biblio_id: Number(recordId),
      pickup_library_id: branch,
    });
  }
  async cancelHold(patron: PatronIdentity, holdId: string) {
    if (
      !numeric(holdId) ||
      !(await this.list("/holds", patron)).some(
        (h) => String(h.hold_id) === holdId,
      )
    )
      throw new AccountError("Hold not found on your account", 404);
    await this.request(`/holds/${holdId}`, "DELETE");
  }
  async renew(patron: PatronIdentity, loanId: string) {
    if (
      !numeric(loanId) ||
      !(await this.list("/checkouts", patron)).some(
        (l) => String(l.checkout_id) === loanId,
      )
    )
      throw new AccountError("Loan not found on your account", 404);
    await this.request(`/checkouts/${loanId}/renewal`, "POST");
  }
}
