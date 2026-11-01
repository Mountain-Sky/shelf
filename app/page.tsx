"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Copy,
  GitCompareArrows,
  LoaderCircle,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Trash2,
  X,
  RotateCcw,
} from "lucide-react";
import type { DiscoveryTrace, Preferences, ResultBook } from "../lib/types";
import { branches } from "../lib/config/branches";
import { BookCard, formatName } from "./components/BookCard";
import { Comparison } from "./components/Comparison";
import { Inspector } from "./components/Inspector";
type Session = { id: string; revision: number };
type Turn = { request: string; reply: string };
type SearchOptions = {
  branch?: string;
  action?: "search" | "branch" | "similar";
  selectedResultId?: string;
  fresh?: boolean;
  quiet?: boolean;
};
const emptyPreferences: Preferences = {
  availability: "any",
  requiredSubjects: [],
  excludedSubjects: [],
};
const starters = [
  {
    label: "A funny mystery",
    detail: "A little intrigue, a little wit",
    glyph: "✳",
  },
  {
    label: "Gentle science fiction",
    detail: "Big ideas. A softer landing.",
    glyph: "☼",
  },
  {
    label: "An adventure for kids",
    detail: "For curious young minds",
    glyph: "↗",
  },
  {
    label: "Something like Project Hail Mary",
    detail: "One more extraordinary journey",
    glyph: "✦",
  },
];
export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [branch, setBranch] = useState("");
  const [books, setBooks] = useState<ResultBook[]>([]);
  const [saved, setSaved] = useState<ResultBook[]>([]);
  const [compared, setCompared] = useState<ResultBook[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(emptyPreferences);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [source, setSource] = useState("demo");
  const [error, setError] = useState("");
  const [contextLost, setContextLost] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [lastRequest, setLastRequest] = useState("Explore the collection");
  const [trace, setTrace] = useState<DiscoveryTrace | null>(null);
  const [showLab, setShowLab] = useState(false);
  const [showShelf, setShowShelf] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const failedRequest = useRef<
    { message: string; options: SearchOptions } | undefined
  >(undefined);
  const session = useRef<Session | undefined>(undefined);
  const inFlight = useRef(false);
  const initialized = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const collection = useRef<HTMLElement>(null);
  const shelf = useRef<HTMLElement>(null);
  async function ask(message = prompt, options: SearchOptions = {}) {
    const q = message.trim();
    if (!q || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setContextLost(false);
    setPrompt("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          message: q,
          branch: options.branch ?? branch,
          action: options.action ?? "search",
          selectedResultId: options.selectedResultId,
          session: options.fresh ? undefined : session.current,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 410 || response.status === 409) {
          setContextLost(true);
          session.current = undefined;
          setBooks([]);
          setPreferences(emptyPreferences);
          setLastRequest("Explore the collection");
        }
        throw new Error(
          data.error ||
            "The collection could not be reached. Please try again.",
        );
      }
      failedRequest.current = undefined;
      session.current = data.session;
      setBranch(data.branch ?? "");
      setPreferences(data.preferences ?? emptyPreferences);
      setNotices(data.notices ?? []);
      setActions(data.suggestedActions ?? []);
      setSource(data.source ?? "demo");
      setTrace(data.trace ?? null);
      if (!data.clarification) {
        setBooks(data.books);
        setLastRequest(options.action === "branch" ? lastRequest : q);
      }
      if (!options.quiet)
        setTurns((previous) => [
          ...previous.slice(-5),
          { request: q, reply: data.reply },
        ]);
      if (options.fresh) setTurns([]);
      setAnnouncement(
        data.clarification
          ? data.reply
          : `${data.books.length} titles found. ${data.books.length ? "Your discoveries have been updated." : "Try a broader search."}`,
      );
      setStarted(true);
      if (!options.quiet)
        collection.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        });
    } catch (e) {
      failedRequest.current = { message: q, options };
      const message =
        e instanceof Error && e.name === "TimeoutError"
          ? "This search is taking longer than expected. Please try again."
          : e instanceof Error
            ? e.message
            : "Search could not be completed.";
      setError(message);
      if (!options.quiet) setPrompt(q);
      setAnnouncement(message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void ask("Explore the collection", { fresh: true, quiet: true });
    }
  }, []);
  function toggleSaved(book: ResultBook) {
    const exists = saved.some((b) => b.id === book.id);
    setSaved((previous) =>
      exists ? previous.filter((b) => b.id !== book.id) : [...previous, book],
    );
    setCopyStatus("");
    setShowShelf(true);
    setAnnouncement(
      exists
        ? `${book.title} removed from your shelf.`
        : `${book.title} saved to your shelf.`,
    );
  }
  function toggleCompare(book: ResultBook) {
    setCompared((previous) =>
      previous.some((b) => b.id === book.id)
        ? previous.filter((b) => b.id !== book.id)
        : previous.length < 3
          ? [...previous, book]
          : previous,
    );
  }
  async function copyList() {
    try {
      await navigator.clipboard.writeText(
        saved.map((b) => `${b.title} — ${b.author}`).join("\n"),
      );
      setCopyStatus("Reading list copied.");
    } catch {
      setCopyStatus("Clipboard unavailable. Select and copy the titles above.");
    }
  }
  function reset() {
    if (busy) return;
    session.current = undefined;
    setPreferences(emptyPreferences);
    setBranch("");
    setTurns([]);
    setNotices([]);
    void ask("Explore the collection", {
      fresh: true,
      quiet: true,
      branch: "",
    });
  }
  const newest = turns.at(-1);
  const isBrowse = lastRequest === "Explore the collection";
  return (
    <>
      <a className="skip-link" href="#discoveries">
        Skip to discoveries
      </a>
      <main>
        <header className="site-header">
          <a
            href="#"
            className="brand"
            aria-label="Shelf home"
            onClick={(e) => {
              e.preventDefault();
              reset();
            }}
          >
            <span className="brand-mark">
              <BookOpen size={24} />
            </span>
            <span>
              shelf<span className="brand-dot">.</span>
            </span>
          </a>
          <nav aria-label="Main navigation">
            <a href="#discoveries" className="nav-active">
              Discover
            </a>
            <button
              onClick={() => {
                setShowShelf(true);
                setTimeout(
                  () =>
                    shelf.current?.scrollIntoView({
                      behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)",
                      ).matches
                        ? "auto"
                        : "smooth",
                      block: "center",
                    }),
                  0,
                );
              }}
            >
              <Bookmark size={16} /> My shelf{" "}
              <span className="nav-count">{saved.length}</span>
            </button>
          </nav>
          <div className="demo-badge">
            <span /> Working demo{" "}
            <span className="demo-badge-extra">
              ·{" "}
              {source === "demo"
                ? "sample catalog"
                : source === "koha"
                  ? "Koha sandbox"
                  : "catalog connection"}
            </span>
          </div>
        </header>
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-star">✳</span> YOUR NEXT CHAPTER STARTS HERE
            </div>
            <h1 id="hero-heading">
              A little curiosity.
              <br />
              <em>A whole new world.</em>
            </h1>
            <p>
              Follow a feeling, find an old favorite, or take an unexpected
              turn. There’s a story here for you.
            </p>
            <form
              className="searchbox"
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
            >
              <Search size={22} aria-hidden="true" />
              <label className="sr-only" htmlFor="discovery-query">
                Describe a book
              </label>
              <input
                id="discovery-query"
                ref={input}
                maxLength={500}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A funny mystery. A hopeful story. Something like…"
                autoComplete="off"
              />
              <button
                type="submit"
                aria-label="Search"
                disabled={busy || !prompt.trim()}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <ArrowRight size={21} />
                )}
              </button>
            </form>
            <p className="search-hint">
              <Sparkles size={13} /> Your words are enough. Titles, authors,
              subjects, or just a mood.
            </p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-sun" />
            <span className="art-spark spark-one">✦</span>
            <span className="art-spark spark-two">✳</span>
            <div className="art-book book-back">
              <span>
                WONDER
                <br />
                AWAITS
              </span>
              <small>take the scenic route</small>
            </div>
            <div className="art-book book-front">
              <span>
                one
                <br />
                more
                <br />
                <em>chapter.</em>
              </span>
              <BookOpen size={24} />
            </div>
            <div className="art-caption">
              A good place to get a little lost.
            </div>
          </div>
        </section>
        <section
          className="starting-points"
          aria-label="Discovery starting points"
        >
          <span className="section-kicker">A PLACE TO BEGIN</span>
          <div className="starter-grid">
            {starters.map((s) => (
              <button
                key={s.label}
                onClick={() => void ask(s.label)}
                disabled={busy}
              >
                <span className="starter-glyph" aria-hidden="true">
                  {s.glyph === "↗" ? <ArrowUpRight size={23} /> : s.glyph}
                </span>
                <span>
                  <strong>{s.label}</strong>
                  <small>{s.detail}</small>
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        </section>
        <section
          className="discovery-workspace"
          id="discoveries"
          ref={collection}
          tabIndex={-1}
          aria-busy={busy}
        >
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">THE COLLECTION, THROUGH YOUR EYES</span>
              <h2>
                {isBrowse
                  ? "Room for your next favorite."
                  : "Follow your curiosity."}
              </h2>
            </div>
            <button className="reset-button" onClick={reset} disabled={busy}>
              <RotateCcw size={15} /> Start fresh
            </button>
          </div>
          <div className="filter-toolbar">
            <div className="filter-group">
              <MapPin size={17} />
              <label htmlFor="branch">Look at</label>
              <select
                id="branch"
                disabled={busy}
                value={branch}
                onChange={(e) =>
                  void ask("Update branch", {
                    branch: e.target.value,
                    action: "branch",
                  })
                }
              >
                <option value="">
                  {source === "demo"
                    ? "All demo branches"
                    : source === "koha"
                      ? "All sandbox branches"
                      : "All configured branches"}
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-divider" />
            <div className="filter-group">
              <BookOpen size={16} />
              <label htmlFor="format-filter" className="sr-only">
                Book format
              </label>
              <select
                id="format-filter"
                value={preferences.format ?? ""}
                disabled={busy}
                onChange={(e) =>
                  void ask(
                    e.target.value
                      ? `Actually ${e.target.value === "large-print" ? "large print" : e.target.value === "print" ? "print" : e.target.value === "audiobook" ? "only audiobooks" : "only ebooks"}`
                      : "Actually all formats",
                  )
                }
              >
                <option value="">All formats</option>
                <option value="print">Print books</option>
                <option value="audiobook">Audiobooks</option>
                <option value="large-print">Large print</option>
                <option value="ebook">Ebooks</option>
              </select>
            </div>
            <div className="filter-group availability-filter">
              <SlidersHorizontal size={16} />
              <label htmlFor="availability-filter" className="sr-only">
                Availability preference
              </label>
              <select
                id="availability-filter"
                disabled={busy}
                value={preferences.availability}
                onChange={(e) =>
                  void ask(
                    e.target.value === "only"
                      ? "Actually only available"
                      : e.target.value === "prefer"
                        ? "Actually prefer available"
                        : "Actually include unavailable",
                  )
                }
              >
                <option value="any">Any availability</option>
                <option value="prefer">Prefer available</option>
                <option value="only">Only available</option>
              </select>
            </div>
            <span className="result-count">
              {busy
                ? "Exploring…"
                : `${books.length} ${books.length === 1 ? "discovery" : "discoveries"}`}
            </span>
          </div>
          <div
            className="active-criteria"
            aria-label="Active discovery criteria"
          >
            {!isBrowse && (
              <span className="query-chip">
                <Search size={12} />
                {lastRequest}
              </span>
            )}
            {preferences.format && (
              <button
                onClick={() => void ask("Actually all formats")}
                disabled={busy}
              >
                {formatName(preferences.format)}
                <X size={12} />
                <span className="sr-only">Remove format filter</span>
              </button>
            )}
            {preferences.maxPages !== undefined && (
              <button
                onClick={() => void ask("Actually any length")}
                disabled={busy}
              >
                Up to {preferences.maxPages} pages
                <X size={12} />
                <span className="sr-only">Remove page limit</span>
              </button>
            )}
            {preferences.requiredSubjects.map((s) => (
              <span key={s}>Subject: {s}</span>
            ))}
            {preferences.excludedSubjects.map((s) => (
              <span key={s}>Without {s}</span>
            ))}
          </div>
          {showShelf && (
            <section
              className="savedArea"
              id="my-shelf"
              ref={shelf}
              aria-labelledby="saved-heading"
            >
              <div className="saved-heading">
                <div>
                  <span className="eyebrow">A FEW GOOD FINDS</span>
                  <h3 id="saved-heading">
                    <BookmarkCheck size={20} /> My discovery shelf (
                    {saved.length})
                  </h3>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close reading list"
                  onClick={() => setShowShelf(false)}
                >
                  <X size={18} />
                </button>
              </div>
              {saved.length ? (
                <>
                  <ul className="saved-titles">
                    {saved.map((b) => (
                      <li key={b.id}>
                        <span>
                          <strong>{b.title}</strong>
                          <small>{b.author}</small>
                        </span>
                        <button
                          aria-label={`Remove ${b.title} from reading list`}
                          onClick={() => toggleSaved(b)}
                        >
                          <X size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="saved-tools">
                    <button
                      className="secondary-button"
                      onClick={() => void copyList()}
                    >
                      <Copy size={14} /> Copy reading list
                    </button>
                    <button
                      className="quiet-button"
                      onClick={() => {
                        setSaved([]);
                        setCopyStatus("");
                      }}
                    >
                      <Trash2 size={14} /> Clear temporary list
                    </button>
                    <small>Only for this visit. No account needed.</small>
                  </div>
                </>
              ) : (
                <p className="empty-panel">
                  Save a title that catches your eye. Your reading list will
                  appear here.
                </p>
              )}
              <p className="copy-status" role="status">
                {copyStatus}
              </p>
            </section>
          )}
          {error && (
            <div
              className="error-banner"
              role="alert"
              aria-label="Search error"
            >
              <div>
                <strong>Let’s try that again.</strong>
                <p>{error}</p>
              </div>
              <button
                className="secondary-button"
                onClick={() => {
                  if (contextLost) {
                    reset();
                    return;
                  }
                  const retry = failedRequest.current;
                  void ask(
                    retry?.message || prompt || "Explore the collection",
                    retry?.options ?? { fresh: !session.current },
                  );
                }}
                disabled={busy}
              >
                {contextLost ? "Start a fresh search" : "Retry search"}{" "}
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          <div className="workspace-body">
            <div className="collection-column">
              {busy && (
                <div className="loading-bar" role="status">
                  <LoaderCircle size={16} className="spin" /> Finding the next
                  turn in your story…
                </div>
              )}
              <div className={`grid ${busy ? "is-loading" : ""}`}>
                {books.map((book, index) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    index={index}
                    saved={saved.some((b) => b.id === book.id)}
                    compared={compared.some((b) => b.id === book.id)}
                    compareFull={compared.length >= 3}
                    busy={busy}
                    onSave={() => toggleSaved(book)}
                    onCompare={() => toggleCompare(book)}
                    onSimilar={() =>
                      void ask("More like this", {
                        action: "similar",
                        selectedResultId: book.id,
                      })
                    }
                  />
                ))}
              </div>
              {!books.length && busy && (
                <div className="skeleton-grid" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <div className="skeleton-book" key={i}>
                      <div />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              )}
              {!books.length && !busy && (
                <div className="empty">
                  <span className="empty-symbol">
                    <BookOpen size={35} />
                  </span>
                  <h3>
                    {started
                      ? "A different path might lead somewhere."
                      : "Your next discovery is waiting."}
                  </h3>
                  <p>
                    {started
                      ? source === "demo"
                        ? "No matching demo titles yet. Try a broader search."
                        : "No matching catalog titles yet. Try a broader search."
                      : "Browse by feeling, discover by conversation."}
                  </p>
                  <small>
                    We won’t fill an empty shelf with unrelated recommendations.
                  </small>
                  <button className="secondary-button" onClick={reset}>
                    Explore the collection <ArrowRight size={15} />
                  </button>
                </div>
              )}
              {!!books.length && (
                <p className="collection-footnote">
                  End of this discovery shelf. Try a refinement to find a
                  different direction.
                </p>
              )}
            </div>
            <aside className="discovery-guide" aria-labelledby="guide-heading">
              <div className="guide-symbol">
                <Sparkles size={20} />
              </div>
              <span className="eyebrow">A LITTLE GUIDANCE</span>
              <h3 id="guide-heading">
                Every book opens
                <br />
                another door.
              </h3>
              <p className="guide-intro">
                Tell us what caught your eye. Keep the feeling, change the
                format, or explore something completely new.
              </p>
              {newest && (
                <div className="conversation">
                  <div className="request-label">Your latest direction</div>
                  <p className="user">{newest.request}</p>
                  <p className="assistant">{newest.reply}</p>
                </div>
              )}
              <div className="refinements">
                <span className="section-kicker">WHERE TO NEXT?</span>
                {(actions.length
                  ? actions
                  : [
                      "Only audiobooks",
                      "A funny mystery",
                      "An adventure for kids",
                    ]
                )
                  .slice(0, 3)
                  .map((q) => (
                    <button key={q} disabled={busy} onClick={() => void ask(q)}>
                      {q}
                      <ChevronRight size={15} />
                    </button>
                  ))}
              </div>
              {turns.length > 1 && (
                <details className="journey">
                  <summary>
                    Your discovery trail <span>{turns.length} turns</span>
                  </summary>
                  {turns.slice(0, -1).map((t, i) => (
                    <div key={i}>
                      <strong>{t.request}</strong>
                      <p>{t.reply}</p>
                    </div>
                  ))}
                </details>
              )}
              <div className="guide-note">
                <span className="note-star">✳</span>
                <p>
                  {source === "demo" ? (
                    <>
                      <strong>Real discovery. Sample data.</strong> These are
                      demonstration records and synthetic branch counts, never
                      live LCPL holdings.
                    </>
                  ) : source === "koha" ? (
                    <>
                      <strong>Koha sandbox catalog.</strong> Records and item
                      observations come from the test ILS, not live LCPL
                      holdings. Availability is not a borrowing or hold
                      guarantee.
                    </>
                  ) : (
                    <>
                      <strong>Catalog observations.</strong> Records come from
                      the connected catalog. Availability is not a borrowing or
                      hold guarantee.
                    </>
                  )}
                </p>
              </div>
            </aside>
          </div>
          {notices.length > 0 && (
            <details className="search-notices">
              <summary>
                {notices.length} {notices.length === 1 ? "note" : "notes"} about
                these results
              </summary>
              {notices.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </details>
          )}
          <div className="labBar">
            <span>
              <span className="status-dot" />
              {source === "demo"
                ? "Demo catalog"
                : source === "koha"
                  ? "Koha sandbox catalog"
                  : `${source} catalog`}{" "}
              · No patron accounts or live holds
            </span>
            <button
              aria-expanded={showLab}
              onClick={() => setShowLab((v) => !v)}
            >
              <Terminal size={14} />
              {showLab ? "Hide" : "Show"} Discovery Engine
            </button>
          </div>
          {showLab && <Inspector trace={trace} />}
        </section>
        <footer>
          <a
            href="#"
            className="footer-brand"
            onClick={(e) => {
              e.preventDefault();
              reset();
            }}
          >
            shelf.
          </a>
          <p>Less searching. More discovering.</p>
          <span>
            Discovery Lab ·{" "}
            {source === "koha"
              ? "Illustrative covers, Koha sandbox records"
              : "Illustrative covers, sample records"}
          </span>
        </footer>
      </main>
      {compared.length > 0 && (
        <div className="compare-dock" aria-label="Selected comparisons">
          <span>
            <GitCompareArrows size={18} />
            <strong>{compared.length}</strong>{" "}
            {compared.length === 1 ? "title" : "titles"} selected
          </span>
          <button onClick={() => setShowCompare(true)}>
            Compare titles <ArrowUpRight size={16} />
          </button>
          <button
            className="dock-clear"
            aria-label="Clear comparison"
            onClick={() => setCompared([])}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <Comparison
        books={compared}
        open={showCompare}
        onClose={() => setShowCompare(false)}
        onRemove={(id) => setCompared((p) => p.filter((b) => b.id !== id))}
        onSave={(book) => {
          if (!saved.some((b) => b.id === book.id))
            setSaved((p) => [...p, book]);
          setShowShelf(true);
          setAnnouncement(`${book.title} saved to your shelf.`);
        }}
      />
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </>
  );
}
