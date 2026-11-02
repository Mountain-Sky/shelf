import { AccountError } from "../circulation";
import { KohaCirculation } from "../providers/koha-circulation";
export function circulationProvider() {
  if (
    process.env.CATALOG_MODE !== "koha" ||
    process.env.KOHA_SANDBOX_ONLY !== "1" ||
    !process.env.KOHA_CIRC_CLIENT_ID
  )
    throw new AccountError(
      "Patron accounts are not configured for this catalog",
      503,
    );
  return new KohaCirculation({
    baseUrl: process.env.KOHA_API_URL || "",
    clientId: process.env.KOHA_CIRC_CLIENT_ID,
    clientSecret: process.env.KOHA_CIRC_CLIENT_SECRET || "",
    patronIds: (process.env.KOHA_TEST_PATRON_IDS || "")
      .split(",")
      .filter(Boolean),
  });
}
