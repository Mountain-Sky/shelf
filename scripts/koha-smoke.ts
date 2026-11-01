import { kohaFromEnvironment } from "../lib/application/koha-config";
import { branches } from "../lib/config/branches";

async function main() {
  const title = process.env.KOHA_SMOKE_TITLE;
  const expected = process.env.KOHA_SMOKE_EXPECT_ID;
  if (!title || !expected)
    throw Error(
      "Set KOHA_SMOKE_TITLE and KOHA_SMOKE_EXPECT_ID from an independently verified sandbox record.",
    );
  const provider = kohaFromEnvironment();
  const page = await provider.search(
    { field: "title", text: title, limit: 20 },
    AbortSignal.timeout(10000),
  );
  const record = page.records.find((r) => r.ref.id === expected);
  if (!record)
    throw Error(
      "The independently verified test record was not returned by Koha.",
    );
  const holdings = await provider.holdings(
    [record.ref],
    branches.map((b) => b.id),
    AbortSignal.timeout(10000),
  );
  if (
    holdings.length !== branches.length ||
    holdings.some((h) => h.status === "unknown")
  )
    throw Error(
      "Sandbox holdings are incomplete or unknown. Verify library mappings and the pinned API contract.",
    );
  console.log(
    JSON.stringify(
      {
        source: "koha",
        record: { id: record.ref.id, title: record.title },
        holdings: holdings.map((h) => ({
          branch: h.branch,
          status: h.status,
          copies: h.copies,
        })),
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Koha sandbox verification failed.",
  );
  process.exitCode = 1;
});
