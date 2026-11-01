import type { DiscoveryInput, Plan, Preferences, CatalogQuery } from "../types";
import { interpret } from "./intent";
import { branches } from "../config/branches";
import { budgets } from "./budgets";
const stop = new Set(
  "the and for from with that this book books want need find show something more less today tomorrow pickup pick up library please about good great looking like read reading have can you are let me some than into your what should recommend available at in of on an is to by my it only preferably actually rather under pages one second first third audiobook audiobooks ebook ebooks print format formats paperback hardcover all any length availability include unavailable reset clear filters collection explore browse".split(
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
  const explicitSelection = input.action === "similar";
  const refers = references.length > 0 || explicitSelection;
  const browse = /^(?:explore|browse)(?: the)? collection[.!]?$/i.test(message);
  const seedMatch = !refers
    ? /(?:^something (?:like|similar to)|^similar to|^books? like|\bI (?:loved|enjoyed|liked))\s+(.+?)(?=,|;|\s+but\b|\s+preferably\b|$)/i.exec(
        message,
      )
    : null;
  const seedTitle = seedMatch?.[1].replace(/^["“]|["”]$/g, "").trim();
  const refinement =
    Boolean(state) &&
    !browse &&
    !seedTitle &&
    (input.action === "branch" ||
      /^(more|less|only|but|something|what about|show me|make it|instead|these|those|actually|prefer|not|no |under|all formats|any format|any length|any availability|include unavailable|clear filters|reset filters)/i.test(
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
  let terms = browse
    ? []
    : refinement && state
      ? [...state.terms]
      : termsFor(message);
  let clarification: string | undefined;
  let excludeResultId = refinement ? state?.seedResultId : undefined;
  if (/^(clear|reset) filters$/i.test(message)) {
    p.availability = "any";
    p.requiredSubjects = [];
    p.excludedSubjects = [];
    delete p.format;
    delete p.maxPages;
  }
  if (input.branch !== undefined) p.branch = input.branch || undefined;
  for (const branch of branches) {
    if (
      new RegExp(`\\b${branch.name}\\b|\\b${branch.id}\\b`, "i").test(message)
    )
      p.branch = branch.id;
  }
  if (/\b(?:available|pick\s*up|on the shelf|in stock)\b/i.test(message))
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
  if (
    !seedTitle &&
    !refers &&
    interpret(message) !== "known_item" &&
    /\bmyster(?:y|ies)\b/i.test(message)
  )
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
    p.excludedSubjects = p.excludedSubjects.filter((s) => s !== "nonfiction");
    terms = terms.filter(
      (t) => !["fiction", "mystery", "fantasy", "science fiction"].includes(t),
    );
  } else if (
    /\bfiction\b/i.test(message) &&
    !/science fiction/i.test(message)
  ) {
    p.requiredSubjects = [
      ...p.requiredSubjects.filter((s) => s !== "nonfiction"),
      "fiction",
    ];
    p.excludedSubjects = [...new Set([...p.excludedSubjects, "nonfiction"])];
    terms = terms.filter((t) => t !== "nonfiction");
  }
  const exclusion =
    /\b(?:no|not|exclude|without)\s+(science fiction|fiction|mystery|mysteries|fantasy|romance|horror|nonfiction)\b/i.exec(
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
    const selected = explicitSelection
      ? state?.snapshot.find((result) => result.id === input.selectedResultId)
      : references.length === 1
        ? state?.snapshot[index]
        : undefined;
    if (!selected)
      clarification =
        "Which displayed title do you mean? Select a title or name it so I can use the right reference.";
    else {
      query = `Similar to ${selected.title}`;
      terms = [...selected.subjects];
      if (!terms.length)
        clarification =
          "This reference title has no catalog subjects to support a similarity search. Tell me a subject or theme you would like.";
      excludeResultId = selected.id;
      if (/shorter/i.test(message)) {
        if (selected.pages === undefined)
          clarification =
            "The selected edition has no verified page count. What maximum page count would you like?";
        else p.maxPages = selected.pages - 1;
      }
    }
  }
  if (/\bmore like (?:this|that)\b/i.test(message) && !explicitSelection) {
    clarification =
      "Which displayed title do you mean? Choose More like this on a book, or name the title.";
  }
  if (/shorter/i.test(message) && !refers)
    clarification =
      "Which title should I compare the length with, or what is your maximum page count?";
  if (refinement && !refers && input.action !== "branch")
    terms = [...terms, ...termsFor(message)];
  const branchWords = new Set(
    branches.flatMap((b) => [
      b.id.toLowerCase(),
      ...b.name.toLowerCase().split(/\s+/),
    ]),
  );
  terms = terms.filter((t) => !branchWords.has(t));
  terms = [...new Set([...terms, ...p.requiredSubjects])]
    .filter((t) => !p.excludedSubjects.includes(t))
    .slice(-budgets.terms);
  p.requiredSubjects = [...new Set(p.requiredSubjects)].slice(0, budgets.terms);
  const intent =
    refers || seedTitle
      ? "recommendation"
      : interpret(input.action === "branch" ? query : message);
  const plan: Plan = {
    intent,
    browse,
    seedTitle,
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
  if (plan.browse)
    return [{ field: "browse", text: "", limit: budgets.pageSize }];
  const add = (field: CatalogQuery["field"], text: string) =>
    queries.push({ field, text: text.slice(0, 500), limit: budgets.pageSize });
  const identifier =
    /^(?:ISBN(?:-1[03])?:?\s*)?((?:97[89][ -]?)?\d[\d -]{8,16}[\dX])$/i.exec(
      plan.query.trim(),
    );
  if (identifier)
    return [
      {
        field: "identifier",
        text: identifier[1].replace(/[ -]/g, "").toUpperCase(),
        limit: budgets.pageSize,
      },
    ];
  const author =
    /^(?:(?:find|show me)\s+)?(?:books?\s+by|author:)\s*(.+)$/i.exec(
      plan.query,
    );
  if (author)
    return [{ field: "author", text: author[1], limit: budgets.pageSize }];
  if (
    plan.intent === "known_item" &&
    !/^(?:books? by|author:)/i.test(plan.query)
  )
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
  if (!queries.length) add("browse", "");
  return queries.slice(0, budgets.queries);
}
