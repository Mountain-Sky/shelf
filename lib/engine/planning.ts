import type { Branch, Plan } from "../types";
import { interpret } from "./intent";
const stop = new Set(
  "the and for from with that this book books want need find show something more less today please about good great looking like read reading have can you are let me some than into your what should recommend available at in of on an is to by my it only".split(
    " ",
  ),
);
const synonyms: Record<string, string[]> = {
  funny: ["humor", "funny"],
  funnier: ["humor", "funny"],
  humorous: ["humor", "funny"],
  cozy: ["cozy", "gentle"],
  gentle: ["gentle", "hopeful"],
  comforting: ["gentle", "hopeful"],
  space: ["space", "science fiction"],
  kids: ["children"],
  child: ["children"],
  mysteries: ["mystery"],
  adventurous: ["adventure"],
  robot: ["robots"],
};
export function planDiscovery(
  message: string,
  branch: Branch = "",
  previousQuery = "",
): Plan {
  const interpreted = interpret(message, previousQuery);
  const words = (
    interpreted.query.toLowerCase().match(/[a-z0-9]+/g) ?? []
  ).filter((w) => w.length > 2 && !stop.has(w));
  const constraints: string[] = [];
  if (/\bonly myster(?:y|ies)\b/i.test(interpreted.query))
    constraints.push("mystery");
  if (/\b(kids|children|child|12.year.old)\b/i.test(interpreted.query))
    constraints.push("children");
  return {
    ...interpreted,
    branch,
    constraints,
    expandedQueries: [
      ...new Set(words.flatMap((w) => synonyms[w] ?? [w])),
    ].slice(0, 40),
  };
}
