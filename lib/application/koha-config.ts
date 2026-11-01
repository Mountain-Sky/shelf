import { KohaProvider } from "../providers/koha";
import type { Format } from "../types";
function mapping(value: string | undefined): Record<string, string> {
  const parsed: unknown = JSON.parse(value || "{}");
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    Object.values(parsed).some((v) => typeof v !== "string")
  )
    throw Error("Koha mappings must be JSON objects with string values.");
  return parsed as Record<string, string>;
}
/** Server-only configuration. This adapter deliberately requires an isolated test catalog. */
export function kohaFromEnvironment() {
  if (process.env.KOHA_SANDBOX_ONLY !== "1")
    throw Error(
      "The initial Koha adapter is restricted to a sandbox; set KOHA_SANDBOX_ONLY=1 for your isolated test instance.",
    );
  return new KohaProvider({
    baseUrl: process.env.KOHA_API_URL || "",
    clientId: process.env.KOHA_CLIENT_ID || "",
    clientSecret: process.env.KOHA_CLIENT_SECRET || "",
    branchMap: mapping(process.env.KOHA_BRANCH_MAP),
    formatMap: mapping(process.env.KOHA_FORMAT_MAP) as Record<string, Format>,
  });
}
