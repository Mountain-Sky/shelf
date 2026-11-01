import test from "node:test";
import assert from "node:assert/strict";
import { coverIsbn } from "../app/ui/covers";
import { readSaved, savedBook, MAX_SAVED } from "../app/ui/reading-list";

test("covers use checksum-valid ISBNs from this edition, including catalog qualifiers", () => {
  const record = (value: string) => ({
    identifiers: [{ scheme: "ISBN", value }],
  });
  assert.equal(
    coverIsbn(record("978-0-385-53322-5 (hardback)")),
    "9780385533225",
  );
  assert.equal(coverIsbn(record("0-8044-2957-X")), "080442957X");
  assert.equal(coverIsbn(record("9780385533226")), undefined);
  assert.equal(
    coverIsbn(record("9780385533225/../../secret")),
    "9780385533225",
  );
  assert.equal(
    coverIsbn({ identifiers: [{ scheme: "local", value: "9780385533225" }] }),
    undefined,
  );
  assert.equal(coverIsbn(undefined), undefined);
});
test("reading list restoration rejects corrupt data, deduplicates and bounds storage", () => {
  assert.deepEqual(readSaved("{"), []);
  assert.deepEqual(readSaved('{"title":"book"}'), []);
  assert.deepEqual(
    readSaved('[null,{}, {"id":1,"title":"X","author":"Y"}]'),
    [],
  );
  const b = {
    id: '["koha","439"]',
    title: "The Left Hand of Darkness",
    author: "Le Guin",
    availability: [{ copies: 1 }],
    session: { id: "old" },
  };
  assert.deepEqual(readSaved(JSON.stringify([b, b])), [savedBook(b)]);
  assert.deepEqual(Object.keys(savedBook(b)), ["id", "title", "author"]);
  assert.equal(
    readSaved(
      JSON.stringify(
        Array.from({ length: 150 }, (_, i) => ({ ...b, id: String(i) })),
      ),
    ).length,
    MAX_SAVED,
  );
});
