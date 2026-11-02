/** Provider-neutral account operations; no catalog discovery or UI imports. */
export type PatronIdentity = { id: string; username: string };
export type PatronAccount = {
  patron: PatronIdentity;
  loans: { id: string; title: string; due: string; renewals: number }[];
  holds: {
    id: string;
    recordId: string;
    title: string;
    pickupBranch: string;
    status: string;
  }[];
};
export interface CirculationProvider {
  authenticate(username: string, password: string): Promise<PatronIdentity>;
  account(patron: PatronIdentity): Promise<PatronAccount>;
  placeHold(
    patron: PatronIdentity,
    recordId: string,
    branch: string,
  ): Promise<void>;
  cancelHold(patron: PatronIdentity, holdId: string): Promise<void>;
  renew(patron: PatronIdentity, loanId: string): Promise<void>;
}
export class AccountError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
