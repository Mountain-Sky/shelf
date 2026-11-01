import type { CatalogRecord, Holding } from "../types";
type FixtureBook = {
  id: string;
  title: string;
  author: string;
  year?: number;
  pages?: number;
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
  {
    id: "demo-9",
    title: "The Long Way to a Small, Angry Planet",
    author: "Becky Chambers",
    year: 2014,
    pages: 404,
    format: "Book",
    subjects: ["science fiction", "space", "hopeful", "friendship", "gentle"],
    summary:
      "A diverse spaceship crew builds friendships while taking on a distant assignment.",
    branches: { ASH: 0, RUST: 1, PUR: 2 },
  },
  {
    id: "demo-10",
    title: "All Systems Red",
    author: "Martha Wells",
    year: 2017,
    pages: 160,
    format: "Book",
    subjects: ["science fiction", "robots", "humor", "adventure"],
    summary:
      "A security android would rather watch entertainment than deal with humans, until danger interrupts.",
    branches: { ASH: 1, RUST: 2, PUR: 0 },
  },
  {
    id: "demo-11",
    title: "To Be Taught, If Fortunate",
    author: "Becky Chambers",
    year: 2019,
    pages: 176,
    format: "Book",
    subjects: ["science fiction", "space", "hopeful", "exploration"],
    summary:
      "An exploration crew considers its responsibilities while studying distant worlds.",
    branches: { ASH: 2, RUST: 0, PUR: 1 },
  },
  {
    id: "demo-12",
    title: "The House in the Cerulean Sea",
    author: "TJ Klune",
    year: 2020,
    pages: 400,
    format: "Book",
    subjects: ["fantasy", "gentle", "hopeful", "friendship"],
    summary:
      "A caseworker visits an unusual orphanage and questions the rules that shape his life.",
    branches: { ASH: 0, RUST: 1, PUR: 2 },
  },
  {
    id: "demo-13",
    title: "Remarkably Bright Creatures",
    author: "Shelby Van Pelt",
    year: 2022,
    pages: 368,
    format: "Book",
    subjects: ["fiction", "gentle", "friendship", "mystery"],
    summary:
      "Connections between an aquarium cleaner, a young man, and an octopus reveal a family mystery.",
    branches: { ASH: 1, RUST: 2, PUR: 0 },
  },
  {
    id: "demo-14",
    title: "Murder on the Orient Express",
    author: "Agatha Christie",
    year: 1934,
    pages: 256,
    format: "Book",
    subjects: ["mystery", "classic", "puzzles"],
    summary: "Hercule Poirot investigates a murder aboard a snowbound train.",
    branches: { ASH: 2, RUST: 0, PUR: 1 },
  },
  {
    id: "demo-15",
    title: "The Hound of the Baskervilles",
    author: "Arthur Conan Doyle",
    year: 1902,
    pages: 256,
    format: "Book",
    subjects: ["mystery", "classic", "suspense"],
    summary:
      "Sherlock Holmes and Dr. Watson investigate a family legend on the moors.",
    branches: { ASH: 0, RUST: 1, PUR: 2 },
  },
  {
    id: "demo-16",
    title: "Truly Devious",
    author: "Maureen Johnson",
    year: 2018,
    pages: 416,
    format: "Book",
    subjects: ["mystery", "teen", "puzzles"],
    summary:
      "A student at a secluded school investigates an old kidnapping and a new mystery.",
    branches: { ASH: 1, RUST: 2, PUR: 0 },
  },
  {
    id: "demo-17",
    title: "Booked",
    author: "Kwame Alexander",
    year: 2016,
    pages: 320,
    format: "Book",
    subjects: ["children", "teen", "soccer", "sports", "poetry"],
    summary:
      "A soccer-loving boy navigates friendships, family changes, and the power of words.",
    branches: { ASH: 2, RUST: 0, PUR: 1 },
  },
  {
    id: "demo-18",
    title: "The Crossover",
    author: "Kwame Alexander",
    year: 2014,
    pages: 240,
    format: "Book",
    subjects: ["children", "teen", "basketball", "sports", "poetry"],
    summary:
      "Twin brothers balance basketball, family expectations, and growing up.",
    branches: { ASH: 0, RUST: 1, PUR: 2 },
  },
  {
    id: "demo-19",
    title: "Tangerine",
    author: "Edward Bloor",
    year: 1997,
    pages: 320,
    format: "Book",
    subjects: ["children", "teen", "soccer", "sports", "mystery"],
    summary:
      "A young soccer player uncovers troubling truths after his family moves to Florida.",
    branches: { ASH: 1, RUST: 2, PUR: 0 },
  },
  {
    id: "demo-20",
    title: "Soccer School: Season 1",
    author: "Alex Bellos and Ben Lyttleton",
    year: 2017,
    pages: 208,
    format: "Book",
    subjects: ["children", "soccer", "sports", "nonfiction", "science"],
    summary:
      "Soccer provides a playful route into questions about science, history, and the world.",
    branches: { ASH: 2, RUST: 0, PUR: 1 },
  },
  {
    id: "demo-21",
    title: "Artificial Intelligence: A Guide for Thinking Humans",
    author: "Melanie Mitchell",
    year: 2019,
    pages: 336,
    format: "Book",
    subjects: [
      "nonfiction",
      "artificial intelligence",
      "technology",
      "science",
      "accessible",
    ],
    summary:
      "An overview of artificial intelligence examines its progress, limitations, and open questions.",
    branches: { ASH: 0, RUST: 1, PUR: 2 },
  },
  {
    id: "demo-22",
    title: "You Look Like a Thing and I Love You",
    author: "Janelle Shane",
    year: 2019,
    pages: 272,
    format: "Book",
    subjects: [
      "nonfiction",
      "artificial intelligence",
      "technology",
      "humor",
      "accessible",
    ],
    summary:
      "Playful experiments illustrate what machine-learning systems can and cannot do.",
    branches: { ASH: 1, RUST: 2, PUR: 0 },
  },
  {
    id: "demo-23",
    title: "Co-Intelligence",
    author: "Ethan Mollick",
    year: 2024,
    pages: 256,
    format: "Book",
    subjects: [
      "nonfiction",
      "artificial intelligence",
      "technology",
      "work",
      "accessible",
    ],
    summary:
      "A practical discussion of working and learning alongside generative AI systems.",
    branches: { ASH: 2, RUST: 0, PUR: 1 },
  },
  {
    id: "demo-24",
    title: "Life 3.0",
    author: "Max Tegmark",
    year: 2017,
    pages: 384,
    format: "Book",
    subjects: [
      "nonfiction",
      "artificial intelligence",
      "technology",
      "science",
      "future",
    ],
    summary:
      "An exploration of possible futures shaped by advanced artificial intelligence.",
    branches: { ASH: 0, RUST: 1, PUR: 2 },
  },
  {
    id: "demo-25",
    title: "The Boy Who Harnessed the Wind",
    author: "William Kamkwamba and Bryan Mealer",
    year: 2009,
    pages: 288,
    format: "Book",
    subjects: ["nonfiction", "science", "engineering", "memoir", "hopeful"],
    summary:
      "A young Malawian inventor describes building a windmill from salvaged materials.",
    branches: { ASH: 1, RUST: 2, PUR: 0 },
  },
  {
    id: "demo-26",
    title: "Braiding Sweetgrass",
    author: "Robin Wall Kimmerer",
    year: 2013,
    pages: 408,
    format: "Book",
    subjects: ["nonfiction", "nature", "science", "essays"],
    summary:
      "Essays bring botanical knowledge into conversation with Indigenous ways of understanding the natural world.",
    branches: { ASH: 2, RUST: 0, PUR: 1 },
  },
  {
    id: "demo-27",
    title: "Hidden Figures",
    author: "Margot Lee Shetterly",
    year: 2016,
    pages: 368,
    format: "Book",
    subjects: ["nonfiction", "science", "space", "history"],
    summary:
      "The history of Black women mathematicians whose work contributed to American aeronautics and spaceflight.",
    branches: { ASH: 0, RUST: 1, PUR: 2 },
  },
  {
    id: "demo-28",
    title: "My Side of the Mountain",
    author: "Jean Craighead George",
    year: 1959,
    pages: 192,
    format: "Book",
    subjects: ["children", "nature", "survival", "adventure", "classic"],
    summary:
      "A boy leaves the city to attempt a life in the Catskill wilderness.",
    branches: { ASH: 1, RUST: 2, PUR: 0 },
  },
  {
    id: "demo-29",
    title: "Island of the Blue Dolphins",
    author: "Scott O'Dell",
    year: 1960,
    pages: 192,
    format: "Book",
    subjects: ["children", "nature", "survival", "adventure", "classic"],
    summary: "A girl survives alone on an island off the California coast.",
    branches: { ASH: 2, RUST: 0, PUR: 1 },
  },
  {
    id: "demo-30",
    title: "The Wild Robot Escapes",
    author: "Peter Brown",
    year: 2018,
    pages: 288,
    format: "Book",
    subjects: ["children", "robots", "nature", "adventure"],
    summary:
      "Roz seeks a way back to her island family after being put to work on a farm.",
    branches: { ASH: 0, RUST: 1, PUR: 2 },
  },
  {
    id: "demo-31",
    title: "Charlotte’s Web",
    author: "E. B. White",
    year: 1952,
    pages: 192,
    format: "Book",
    subjects: ["children", "animals", "friendship", "gentle", "classic"],
    summary:
      "A spider helps a young pig through a remarkable act of friendship.",
    branches: { ASH: 1, RUST: 2, PUR: 0 },
  },
  {
    id: "demo-32",
    title: "A Bear Called Paddington",
    author: "Michael Bond",
    year: 1958,
    pages: 144,
    format: "Book",
    subjects: ["children", "humor", "adventure", "classic"],
    summary:
      "A family takes in a polite bear whose new life in London leads to comic adventures.",
    branches: { ASH: 2, RUST: 0, PUR: 1 },
  },
];

// All additional edition/extent/holdings values below are explicit test fixtures,
// not assertions about a real edition or LCPL collection.
const stamp = "2026-01-01T00:00:00.000Z";
export const catalogRecords: CatalogRecord[] = demo.map((b, i) => ({
  ref: { provider: "demo", id: b.id },
  title: b.title,
  contributors: [{ name: b.author, role: "author" }],
  identifiers:
    b.id === "demo-1" ? [{ scheme: "isbn", value: "9780593135204" }] : [],
  year: b.year,
  format: "print",
  language: "en",
  subjects: b.subjects.includes("nonfiction")
    ? b.subjects
    : [...b.subjects, "fiction"],
  summary: b.summary,
  extent:
    i === 6
      ? undefined
      : { pages: b.pages ?? [496, 369, 160, 192, 304, 288, 0, 310][i] },
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
  identifiers: [],
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

// Additional format alternatives deliberately use synthetic edition metadata.
for (const id of [
  "demo-3",
  "demo-4",
  "demo-10",
  "demo-14",
  "demo-17",
  "demo-20",
  "demo-22",
  "demo-23",
  "demo-29",
  "demo-31",
]) {
  const original = catalogRecords.find((record) => record.ref.id === id)!;
  const audioId = `${id}-audio`;
  catalogRecords.push({
    ...structuredClone(original),
    ref: { provider: "demo", id: audioId },
    identifiers: [],
    format: "audiobook",
    extent: { minutes: 360 },
  });
  for (const [index, branch] of ["ASH", "RUST", "PUR"].entries()) {
    const copies = index === 1 ? 1 : 0;
    fixtureHoldings.push({
      record: { provider: "demo", id: audioId },
      branch,
      copies,
      status: copies ? "available" : "unavailable",
      observedAt: stamp,
      provenance: {
        source: "Shelf synthetic holdings",
        kind: "fixture",
        observedAt: stamp,
      },
    });
  }
}
