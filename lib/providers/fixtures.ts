import type { CatalogRecord, Holding } from "../types";
type FixtureBook = {
  id: string;
  title: string;
  author: string;
  year: number;
  format: string;
  subjects: string[];
  summary: string;
  branches: Record<string, number>;
};
const demo: FixtureBook[] = [
  {
    id: "demo-1",
    title: "Project Hail Mary",
    author: "Andy Weir",
    year: 2021,
    format: "Book",
    subjects: ["science fiction", "humor", "space", "adventure"],
    summary: "A lone astronaut must solve an extraordinary scientific mystery.",
    branches: { ASH: 2, RUST: 0, PUR: 1 },
  },
  {
    id: "demo-2",
    title: "The Martian",
    author: "Andy Weir",
    year: 2011,
    format: "Book",
    subjects: ["science fiction", "humor", "survival", "space"],
    summary: "An astronaut improvises to survive after being stranded on Mars.",
    branches: { ASH: 1, RUST: 1, PUR: 0 },
  },
  {
    id: "demo-3",
    title: "A Psalm for the Wild-Built",
    author: "Becky Chambers",
    year: 2021,
    format: "Book",
    subjects: ["science fiction", "gentle", "hopeful", "robots"],
    summary: "A tea monk meets a robot and explores what humans need.",
    branches: { ASH: 0, RUST: 1, PUR: 2 },
  },
  {
    id: "demo-4",
    title: "The Westing Game",
    author: "Ellen Raskin",
    year: 1978,
    format: "Book",
    subjects: ["mystery", "children", "funny", "puzzles"],
    summary: "Young heirs solve an eccentric and playful mystery.",
    branches: { ASH: 1, RUST: 2, PUR: 0 },
  },
  {
    id: "demo-5",
    title: "Escape from Mr. Lemoncello’s Library",
    author: "Chris Grabenstein",
    year: 2013,
    format: "Book",
    subjects: ["mystery", "children", "funny", "libraries"],
    summary: "Kids solve puzzles in a fantastical library competition.",
    branches: { ASH: 2, RUST: 1, PUR: 1 },
  },
  {
    id: "demo-6",
    title: "The Wild Robot",
    author: "Peter Brown",
    year: 2016,
    format: "Book",
    subjects: ["children", "robots", "nature", "adventure"],
    summary: "A robot learns to survive on an island among animals.",
    branches: { ASH: 0, RUST: 2, PUR: 1 },
  },
  {
    id: "demo-7",
    title: "The Thursday Murder Club",
    author: "Richard Osman",
    year: 2020,
    format: "Book",
    subjects: ["mystery", "funny", "cozy", "adult"],
    summary: "Four retirees take on a real murder mystery.",
    branches: { ASH: 2, RUST: 0, PUR: 1 },
  },
  {
    id: "demo-8",
    title: "The Hobbit",
    author: "J. R. R. Tolkien",
    year: 1937,
    format: "Book",
    subjects: ["fantasy", "adventure", "classic"],
    summary: "Bilbo Baggins embarks on an unexpected journey.",
    branches: { ASH: 1, RUST: 1, PUR: 2 },
  },
];

// All additional edition/extent/holdings values below are explicit test fixtures,
// not assertions about a real edition or LCPL collection.
const stamp = "2026-01-01T00:00:00.000Z";
export const catalogRecords: CatalogRecord[] = demo.map((b, i) => ({
  ref: { provider: "demo", id: b.id },
  title: b.title,
  contributors: [{ name: b.author, role: "author" }],
  identifiers: [],
  year: b.year,
  format: "print",
  language: "en",
  subjects: b.subjects,
  summary: b.summary,
  extent:
    i === 6 ? undefined : { pages: [496, 369, 160, 192, 304, 288, 0, 310][i] },
  work: { source: "fixture-editor", id: b.id },
  provenance: {
    source: "Shelf curated demo fixtures",
    kind: "fixture",
    observedAt: stamp,
  },
}));
catalogRecords.push({
  ...catalogRecords[0],
  ref: { provider: "demo", id: "demo-1-audio" },
  format: "audiobook",
  extent: { minutes: 960 },
});
catalogRecords.push({
  ...catalogRecords[7],
  ref: { provider: "demo", id: "demo-8-large" },
  format: "large-print",
  extent: { pages: 420 },
});
export const fixtureHoldings: Holding[] = demo.flatMap((b) =>
  Object.entries(b.branches).map(([branch, copies]) => ({
    record: { provider: "demo", id: b.id },
    branch,
    copies,
    status: copies > 0 ? "available" : "unavailable",
    observedAt: stamp,
    provenance: {
      source: "Shelf synthetic holdings",
      kind: "fixture",
      observedAt: stamp,
    },
  })),
);
fixtureHoldings.push({
  record: { provider: "demo", id: "demo-1-audio" },
  branch: "RUST",
  copies: 1,
  status: "available",
  observedAt: stamp,
  provenance: {
    source: "Shelf synthetic holdings",
    kind: "fixture",
    observedAt: stamp,
  },
});
// The large-print edition deliberately has missing holdings.
