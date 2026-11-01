"use client";
import { useState } from "react";
import {
  ArrowUp,
  BookOpen,
  MapPin,
  Search,
  Sparkles,
  Bug,
  Bookmark,
  BookmarkCheck,
  Copy,
} from "lucide-react";
import type { ResultBook as Book } from "../lib/types";
import type { DiscoveryTrace } from "../lib/types";
import { branches } from "../lib/config/branches";
type Turn = { role: "user" | "assistant"; text: string };
export default function Home() {
  const [prompt, setPrompt] = useState(""),
    [branch, setBranch] = useState("");
  const [books, setBooks] = useState<Book[]>([]),
    [turns, setTurns] = useState<Turn[]>([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [session, setSession] = useState<{ id: string; revision: number }>();
  const [notices, setNotices] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [resultBranch, setResultBranch] = useState("");
  const [busy, setBusy] = useState(false),
    [source, setSource] = useState("demo");
  const [trace, setTrace] = useState<DiscoveryTrace | null>(null),
    [showLab, setShowLab] = useState(false);
  const [saved, setSaved] = useState<Book[]>([]);
  async function ask(
    q = prompt,
    selectedBranch = branch,
    action: "search" | "branch" = "search",
  ) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setPrompt("");
    setTurns((prev) => [...prev, { role: "user", text: q }]);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          branch: selectedBranch,
          action,
          session,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 410) {
          setSession(undefined);
          setBooks([]);
        }
        throw Error(data.error || "Search failed");
      }
      setSession(data.session);
      setNotices(data.notices);
      setActions(data.suggestedActions);
      setBranch(data.branch);
      setResultBranch(data.branch);
      if (!data.clarification) setBooks(data.books);
      setSource(data.source);
      setTrace(data.trace ?? null);
      setTurns((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (e) {
      setPrompt(q);
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          text: e instanceof Error ? e.message : "Search failed",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  function toggleSaved(book: Book) {
    setSaved((s) =>
      s.some((b) => b.id === book.id)
        ? s.filter((b) => b.id !== book.id)
        : [...s, book],
    );
  }
  return (
    <main>
      <header>
        <div className="brand">
          <div className="mark">
            <BookOpen size={22} />
          </div>
          <strong>
            shelf<span className="period">.</span>
          </strong>
          <span className="prototype">DISCOVERY LAB</span>
        </div>
        <div className="status">
          <span className="dot" />{" "}
          {source === "demo" ? "Demo catalog" : `${source} catalog`}
        </div>
      </header>
      <section className="hero">
        <div className="eyebrow">
          <Sparkles size={15} /> A NEW WAY TO EXPLORE THE LIBRARY
        </div>
        <h1>
          What are you <em>in the mood</em> for?
        </h1>
        <p>
          Ask about stories, subjects, or something you can’t quite describe.
          We’ll help you find your next great read.
        </p>
        <div className="searchbox">
          <Search size={20} />
          <input
            maxLength={500}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask();
            }}
            placeholder="A funny mystery for my 12-year-old..."
            aria-label="Describe a book"
          />
          <button
            aria-label="Search"
            onClick={() => ask()}
            disabled={busy || !prompt.trim()}
          >
            <ArrowUp size={20} />
          </button>
        </div>
        <div className="filters">
          <MapPin size={16} />
          <label htmlFor="branch">Look at</label>
          <select
            id="branch"
            disabled={busy}
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              if (session) void ask("Update branch", e.target.value, "branch");
            }}
          >
            <option value="">All demo branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="chips">
          {[
            "Something like Project Hail Mary",
            "A funny mystery",
            "Gentle science fiction",
            "An adventure for kids",
          ].map((q) => (
            <button key={q} disabled={busy} onClick={() => ask(q)}>
              {q} <span>↗</span>
            </button>
          ))}
        </div>
      </section>
      <section className="results" aria-busy={busy}>
        <div className="resultsTop">
          <div>
            <div className="eyebrow">DISCOVER YOUR NEXT READ</div>
            <h2>
              {books.length
                ? "Curated for your curiosity"
                : "Explore something unexpected"}
            </h2>
          </div>
          <span className="count">
            {books.length ? `${books.length} titles` : "Start with a question"}
          </span>
        </div>
        <div className="labBar">
          <span style={{ fontSize: 13, color: "#61746e" }}>
            Prototype catalog data only · No patron accounts or live holds
          </span>
          <button aria-expanded={showLab} onClick={() => setShowLab((x) => !x)}>
            <Bug
              size={15}
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />
            {showLab ? "Hide" : "Show"} Discovery Engine
          </button>
        </div>
        {showLab && (
          <div
            className="labPanel"
            role="region"
            aria-label="Discovery Engine inspector"
          >
            <h3>Discovery Engine · Developer inspector</h3>
            {trace ? (
              <>
                <p className="smallText">
                  <b>Intent:</b> {trace.intent} · <b>Candidate records:</b>{" "}
                  {trace.candidateCount} · <b>Pipeline:</b>{" "}
                  {trace.stagesMs.total} ms (including response)
                </p>
                <p className="smallText">
                  <b>Query:</b> {trace.query}
                </p>
                <p className="smallText">
                  <b>Expansion:</b>{" "}
                  {trace.expandedQueries.join(" · ") || "(none)"}
                </p>
                <p className="smallText">
                  <b>Constraints:</b>{" "}
                  {trace.constraints.join(" · ") || "(none)"}
                </p>
                <h4>Retrieved candidates</h4>
                <pre>{JSON.stringify(trace.candidates, null, 2)}</pre>
                <h4>Model calls and stage timings</h4>
                <pre>
                  {JSON.stringify(
                    { modelCalls: trace.modelCalls, stagesMs: trace.stagesMs },
                    null,
                    2,
                  )}
                </pre>
                <h4>Queries, grouping, and holdings</h4>
                <pre>
                  {JSON.stringify(
                    {
                      queries: trace.queries,
                      grouping: trace.grouping,
                      availability: trace.availability,
                    },
                    null,
                    2,
                  )}
                </pre>
                <h4>Ranking trace</h4>
                <pre>
                  {trace.ranked
                    .map(
                      (r) =>
                        `${r.score.toString().padStart(2)}  ${r.title} — ${r.reasons.join("; ") || "no matched terms"}`,
                    )
                    .join("\n")}
                </pre>
                {trace.notes.map((n) => (
                  <p key={n} className="smallText">
                    • {n}
                  </p>
                ))}
              </>
            ) : (
              <p className="smallText">
                Enable SHELF_INSPECTOR=1 on your local server and search to
                inspect the engine. Request text is omitted from diagnostics.
              </p>
            )}
          </div>
        )}
        {notices.length > 0 && (
          <div className="labPanel" role="status">
            {notices.map((n, i) => (
              <p key={i}>{n}</p>
            ))}
          </div>
        )}
        {saved.length > 0 && (
          <div className="savedArea">
            <h3>
              <BookmarkCheck size={18} style={{ verticalAlign: "middle" }} /> My
              discovery shelf ({saved.length})
            </h3>
            <p>{saved.map((b) => b.title).join(" · ")}</p>
            <button
              className="miniAction"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    saved.map((b) => `${b.title} — ${b.author}`).join("\n"),
                  );
                  setCopyStatus("Reading list copied.");
                } catch {
                  setCopyStatus(
                    "Clipboard unavailable. Select and copy the titles above.",
                  );
                }
              }}
            >
              <Copy size={14} style={{ verticalAlign: "middle" }} /> Copy
              reading list
            </button>
            <button
              className="miniAction"
              onClick={() => {
                setSaved([]);
                setCopyStatus("");
              }}
            >
              Clear temporary list
            </button>
            <p role="status">{copyStatus}</p>
            <small>Stored only for this page session.</small>
          </div>
        )}
        {turns.length > 0 && (
          <div className="conversation" aria-live="polite">
            {turns.map((t, i) => (
              <p key={i} className={t.role}>
                <b>{t.role === "user" ? "You" : "Shelf"}:</b> {t.text}
              </p>
            ))}
          </div>
        )}
        {turns.length > 0 && (
          <div className="refinements">
            {actions.map((q) => (
              <button key={q} disabled={busy} onClick={() => ask(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        {busy && (
          <p className="loading" role="status">
            Exploring the collection...
          </p>
        )}
        <div className="grid">
          {books.map((b, i) => (
            <article key={b.id} className="book">
              <div className={"cover cover" + (i % 5)}>
                <div className="coverTitle">{b.title}</div>
                <div className="coverAuthor">{b.author}</div>
              </div>
              <div className="bookContent">
                <div className="bookFormat">
                  {b.format} • {b.year ?? "Edition unknown"}
                </div>
                <h3>{b.title}</h3>
                <div className="by">by {b.author}</div>
                <p>{b.summary}</p>
                <div className="holdings">
                  {b.availability
                    .filter((a) => !resultBranch || a.branch === resultBranch)
                    .map((a) => (
                      <span
                        key={a.branch}
                        className={
                          a.status === "available" ? "available" : "unavailable"
                        }
                      >
                        {a.branch}:{" "}
                        {a.status === "unknown"
                          ? "Availability unknown"
                          : a.copies + " demo copies"}
                      </span>
                    ))}
                </div>
                <button
                  className={
                    "miniAction " +
                    (saved.some((x) => x.id === b.id) ? "active" : "")
                  }
                  onClick={() => toggleSaved(b)}
                >
                  {saved.some((x) => x.id === b.id) ? (
                    <BookmarkCheck size={15} />
                  ) : (
                    <Bookmark size={15} />
                  )}{" "}
                  {saved.some((x) => x.id === b.id)
                    ? "Saved to your shelf"
                    : "Save for later"}
                </button>
                {b.editions.length > 1 && (
                  <details>
                    <summary>{b.editions.length} catalog editions</summary>
                    {b.editions.map((e) => (
                      <p key={JSON.stringify(e.record.ref)}>
                        {e.record.format} · {e.record.year ?? "Year unknown"} ·{" "}
                        {e.availability
                          .map((h) => `${h.branch}: ${h.status}`)
                          .join(", ")}
                        <br />
                        <small>{e.record.provenance.source}</small>
                      </p>
                    ))}
                  </details>
                )}
                {b.catalogUrl && (
                  <a
                    href={b.catalogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View in catalog ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
        {!books.length && (
          <div className="empty">
            <BookOpen size={35} />
            <p>
              {turns.length
                ? "No matching demo titles yet. Try a broader search."
                : "Browse by feeling, discover by conversation."}
            </p>
            <small>
              This first version uses clearly labeled demo records. Live CarlX
              integration comes next.
            </small>
          </div>
        )}
      </section>
      <footer>
        Built for discovery. Powered by your library.{" "}
        <span>Local prototype • No patron accounts</span>
      </footer>
    </main>
  );
}
