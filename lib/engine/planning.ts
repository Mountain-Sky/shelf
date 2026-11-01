import type { DiscoveryInput, Plan, Preferences, CatalogQuery } from "../types";
import { interpret } from "./intent";
import { branches } from "../config/branches";
import { budgets } from "./budgets";
const stop = new Set(
  "the and for from with that this book books want need find show something more less today please about good great looking like read reading have can you are let me some than into your what should recommend available at in of on an is to by my it only preferably actually rather under pages one second first third audiobook audiobooks ebook ebooks print format formats paperback hardcover".split(
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
export function termsFor(text: string): string[] {
  return [
    ...new Set(
      (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
        .filter((w) => w.length > 2 && !stop.has(w))
        .flatMap((w) => synonyms[w] ?? [w]),
    ),
  ].slice(0, budgets.terms);
}
export function planDiscovery(input: DiscoveryInput): Plan {
  const { state } = input;
  const message = input.message.trim();
  const ordinalReferences = [
    ...message.matchAll(
      /\b(first|second|third)\s+(?:one|recommendation|result|book)\b/gi,
    ),
  ];
  const numericReferences = [
    ...message.matchAll(/\b(?:result|recommendation)\s+([1-9]\d*)\b/gi),
  ];
  const references = [...ordinalReferences, ...numericReferences];
  const refers = references.length > 0;
  const refinement =
    Boolean(state) &&
    (input.action === "branch" ||
      /^(more|less|only|but|something|what about|show me|make it|instead|these|those|actually|prefer|not|no |under)/i.test(
        message,
      ) ||
      refers);
  const p: Preferences =
    refinement && state
      ? {
          ...state.preferences,
          requiredSubjects: [...state.preferences.requiredSubjects],
          excludedSubjects: [...state.preferences.excludedSubjects],
        }
      : { availability: "any", requiredSubjects: [], excludedSubjects: [] };
  let query = refinement && state ? state.goal : message;
  let terms = refinement && state ? [...state.terms] : termsFor(message);
  let clarification: string | undefined;
  let excludeResultId = refinement ? state?.seedResultId : undefined;
  if (input.branch !== undefined) p.branch = input.branch || undefined;
  for (const branch of branches) {
    if (
      new RegExp(`\\b${branch.name}\\b|\\b${branch.id}\\b`, "i").test(message)
    )
      p.branch = branch.id;
  }
  if (/\bavailable\b/i.test(message))
    p.availability = /prefer|preferably/i.test(message) ? "prefer" : "only";
  if (/\b(any availability|include unavailable)\b/i.test(message))
    p.availability = "any";
  if (/\b(all formats|any format)\b/i.test(message)) delete p.format;
  else if (/\baudiobooks?\b/i.test(message)) p.format = "audiobook";
  else if (/\blarge print\b/i.test(message)) p.format = "large-print";
  else if (/\be-?books?\b/i.test(message)) p.format = "ebook";
  else if (/\b(print|paperback|hardcover)\b/i.test(message)) p.format = "print";
  const pages = /\bunder\s+(\d{1,5})\s+pages\b/i.exec(message);
  if (pages) p.maxPages = Number(pages[1]) - 1;
  if (/\b(any length|no page limit)\b/i.test(message)) delete p.maxPages;
  if (/\bonly myster(?:y|ies)\b/i.test(message))
    p.requiredSubjects = [
      ...p.requiredSubjects.filter((s) => s !== "mystery"),
      "mystery",
    ];
  if (
    /\b(kids|children|child|nine.year.old|9.year.old|12.year.old)\b/i.test(
      message,
    )
  )
    p.requiredSubjects = [...new Set([...p.requiredSubjects, "children"])];
  if (/\bnonfiction\b/i.test(message)) {
    p.requiredSubjects = p.requiredSubjects.filter(
      (s) => !["fiction", "mystery", "fantasy", "science fiction"].includes(s),
    );
    p.requiredSubjects.push("nonfiction");
    terms = terms.filter(
      (t) => !["fiction", "mystery", "fantasy", "science fiction"].includes(t),
    );
  } else if (/\bfiction\b/i.test(message) && !/science fiction/i.test(message))
    p.requiredSubjects = p.requiredSubjects.filter((s) => s !== "nonfiction");
  const exclusion =
    /\b(?:no|not|exclude|without)\s+(mystery|mysteries|fantasy|romance|horror|nonfiction)\b/i.exec(
      message,
    );
  if (exclusion) {
    const subject =
      exclusion[1].toLowerCase() === "mysteries"
        ? "mystery"
        : exclusion[1].toLowerCase();
    p.excludedSubjects = [...new Set([...p.excludedSubjects, subject])];
    p.requiredSubjects = p.requiredSubjects.filter((s) => s !== subject);
    terms = terms.filter((t) => t !== subject);
  }
  if (refers) {
    const word = references[0]?.[1]?.toLowerCase();
    const index =
      word === "first"
        ? 0
        : word === "second"
          ? 1
          : word === "third"
            ? 2
            : Number(word) - 1;
    const selected =
      references.length === 1 ? state?.snapshot[index] : undefined;
    if (!selected)
      clarification =
        "Which displayed title do you mean? Select a title or name it so I can use the right reference.";
    else {
      query = `Similar to ${selected.title}`;
      terms = [...selected.subjects];
      excludeResultId = selected.id;
      if (/shorter/i.test(message)) {
        if (selected.pages === undefined)
          clarification =
            "The selected edition has no verified page count. What maximum page count would you like?";
        else p.maxPages = selected.pages - 1;
      }
    }
  }
  if (/shorter/i.test(message) && !refers)
    clarification =
      "Which title should I compare the length with, or what is your maximum page count?";
  if (refinement && !refers && input.action !== "branch")
    terms = [...terms, ...termsFor(message)];
  terms = [...new Set([...terms, ...p.requiredSubjects])]
    .filter((t) => !p.excludedSubjects.includes(t))
    .slice(-budgets.terms);
  p.requiredSubjects = [...new Set(p.requiredSubjects)].slice(0, budgets.terms);
  const intent = interpret(message);
  const plan: Plan = {
    intent,
    query: query.slice(0, 500),
    expandedQueries: terms,
    preferences: p,
    refinement,
    queries: [],
    clarification,
    excludeResultId,
    constraints: [],
  };
  plan.constraints = [
    ...p.requiredSubjects.map((s) => `Subject: ${s}`),
    ...p.excludedSubjects.map((s) => `Exclude: ${s}`),
    ...(p.format ? [`Format: ${p.format}`] : []),
    ...(p.maxPages !== undefined ? [`Maximum pages: ${p.maxPages}`] : []),
    ...(p.availability !== "any"
      ? [`Availability: ${p.availability}${p.branch ? " at " + p.branch : ""}`]
      : []),
  ];
  plan.queries = queriesFor(plan);
  return plan;
}
export function queriesFor(plan: Plan): CatalogQuery[] {
  const queries: CatalogQuery[] = [];
  const add = (field: CatalogQuery["field"], text: string) =>
    queries.push({ field, text: text.slice(0, 500), limit: budgets.pageSize });
  const identifier = plan.query.match(/\b(?:97[89])?\d[\d -]{8,16}[\dX]\b/i);
  if (identifier) add("identifier", identifier[0].replace(/[ -]/g, ""));
  else if (plan.intent === "known_item")
    add(
      "title",
      plan.query.replace(/^(find|where is|do you have|search for)\s+/i, ""),
    );
  if (/^books? by |^author:/i.test(plan.query))
    add("author", plan.query.replace(/^books? by |^author:\s*/i, ""));
  if (plan.expandedQueries.length)
    add("keyword", plan.expandedQueries.join(" "));
  for (const subject of plan.preferences.requiredSubjects)
    add("subject", subject);
  if (
    (plan.intent === "availability" &&
      !plan.preferences.requiredSubjects.length) ||
    !queries.length
  )
    add("browse", "");
  return queries.slice(0, budgets.queries);
}
