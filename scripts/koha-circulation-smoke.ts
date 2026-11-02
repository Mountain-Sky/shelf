// Opt-in MUTATING smoke test: renews one dedicated synthetic loan and creates/cancels one synthetic hold.
import assert from "node:assert/strict";
import fs from "node:fs";
import { KohaCirculation } from "../lib/providers/koha-circulation";
async function main() {
  if (!process.env.SHELF_KOHA_ACCOUNT_FIXTURE)
    throw Error(
      "Set SHELF_KOHA_ACCOUNT_FIXTURE to the private synthetic credentials file",
    );
  const c = JSON.parse(
    fs.readFileSync(process.env.SHELF_KOHA_ACCOUNT_FIXTURE, "utf8"),
  );
  const r = {
    KOHA_API_URL: process.env.KOHA_API_URL || "http://127.0.0.1:18081/api/v1",
  };
  const p = new KohaCirculation({
    baseUrl: r.KOHA_API_URL,
    clientId: c.KOHA_CIRC_CLIENT_ID,
    clientSecret: c.KOHA_CIRC_CLIENT_SECRET,
    patronIds: c.KOHA_TEST_PATRON_IDS.split(","),
  });
  const who = await p.authenticate(c.username, c.password),
    other = await p.authenticate(c.other_username, c.password);
  await assert.rejects(p.authenticate(c.username, "incorrect-password"));
  const before = await p.account(who);
  assert.equal(before.loans.length, 1);
  await assert.rejects(p.renew(other, before.loans[0].id));
  await p.renew(who, before.loans[0].id);
  const renewed = await p.account(who);
  assert.equal(renewed.loans[0].renewals, before.loans[0].renewals + 1);
  const record = String(
    c.records.find((r: any) => r.kind === "HOLD").biblio_id,
  );
  await p.placeHold(who, record, "CPL");
  const held = await p.account(who);
  const hold = held.holds.find((h) => h.recordId === record);
  assert.ok(hold);
  try {
    await assert.rejects(p.cancelHold(other, hold.id));
    await assert.rejects(p.placeHold(who, record, "CPL"));
  } finally {
    await p.cancelHold(who, hold.id);
  }
  assert.equal(
    (await p.account(who)).holds.some((h) => h.id === hold.id),
    false,
  );
  console.log(
    "PASS real Koha: login, rejected password, loan renewal + readback, hold + readback, duplicate rejection, cross-patron isolation, cancellation + readback",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
