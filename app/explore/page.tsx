"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, X } from "lucide-react";
import type { CatalogBranch, Preferences, ResultBook } from "../../lib/types";
import { Comparison } from "../components/Comparison";
import { BookCover } from "../components/BookCover";
import { BookCard, selectedEdition } from "../components/BookCard";
import { coverIsbn } from "../ui/covers";
import {
  MAX_SAVED,
  READING_LIST_KEY,
  readSaved,
  savedBook,
  type SavedBook,
} from "../ui/reading-list";
import styles from "./explore.module.css";

type Session = { id: string; revision: number };
type ResponseData = {
  books: ResultBook[];
  reply: string;
  clarification?: string;
  session: Session;
  branches: CatalogBranch[];
  branch: string;
  preferences: Preferences;
  source: string;
  notices: string[];
};
type Options = {
  fresh?: boolean;
  branch?: string;
  similar?: ResultBook;
  quiet?: boolean;
};
const initialPreferences: Preferences = {
  availability: "any",
  requiredSubjects: [],
  excludedSubjects: [],
};

export default function Explore() {
  const [books, setBooks] = useState<ResultBook[]>([]);
  const [branches, setBranches] = useState<CatalogBranch[]>([]);
  const [branch, setBranch] = useState("");
  const [preferences, setPreferences] = useState(initialPreferences);
  const [prompt, setPrompt] = useState("");
  const [direction, setDirection] = useState("A place to begin.");
  const [reply, setReply] = useState("");
  const [notices, setNotices] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [change, setChange] = useState("");
  const [selected, setSelected] = useState<string>();
  const [anchor, setAnchor] = useState<ResultBook>();
  const [compared, setCompared] = useState<ResultBook[]>([]);
  const [comparing, setComparing] = useState(false);
  const [saved, setSaved] = useState<SavedBook[]>([]);
  const [storageNotice, setStorageNotice] = useState("");
  const session = useRef<Session | undefined>(undefined);
  const lock = useRef(false);
  const initialized = useRef(false);
  const detail = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  async function navigate(message: string, options: Options = {}) {
    if (!message.trim() || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          message,
          branch: options.branch ?? branch,
          session: options.fresh ? undefined : session.current,
          action: options.similar
            ? "similar"
            : options.branch !== undefined && !options.fresh
              ? "branch"
              : "search",
          selectedResultId: options.similar?.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if ([409, 410].includes(response.status)) {
          session.current = undefined;
          throw Error(
            "This exploration has expired. Choose Start fresh to reconnect; the displayed shelf is from your previous request.",
          );
        }
        throw Error(
          data.error ||
            "The catalog could not be reached. Your previous shelf is still here.",
        );
      }
      const result = data as ResponseData;
      session.current = result.session;
      setReply(result.reply);
      setNotices(result.notices);
      setSource(result.source);
      setBranches(result.branches);
      setBranch(result.branch);
      setPreferences(result.preferences);
      if (!result.clarification) {
        const previous = new Set(books.map((b) => b.id));
        const retained = result.books.filter((b) => previous.has(b.id)).length;
        setChange(
          options.quiet
            ? `${result.books.length} titles to explore`
            : `${result.books.length} titles · ${retained} kept · ${result.books.length - retained} newly shown`,
        );
        setBooks(result.books);
        setCompared([]);
        setComparing(false);
        setSelected(undefined);
        if (options.similar) setAnchor(options.similar);
        else if (options.branch === undefined || options.fresh)
          setAnchor(undefined);
        if (!options.quiet && options.branch === undefined)
          setDirection(message);
        if (options.fresh && options.quiet) setDirection("A place to begin.");
      }
      if (!options.quiet) setPrompt(message);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Discovery could not be completed.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void navigate("Explore the collection", { fresh: true, quiet: true });
    }
    const sync = () => {
      try {
        setSaved(readSaved(localStorage.getItem(READING_LIST_KEY)));
      } catch {
        setStorageNotice("Saving is unavailable in this browser.");
      }
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (selected) detail.current?.focus();
  }, [selected]);
  function save(book: ResultBook) {
    try {
      const latest = readSaved(localStorage.getItem(READING_LIST_KEY));
      const next = latest.some((b) => b.id === book.id)
        ? latest.filter((b) => b.id !== book.id)
        : [...latest, savedBook(book)].slice(0, MAX_SAVED);
      localStorage.setItem(READING_LIST_KEY, JSON.stringify(next));
      setSaved(next);
      setStorageNotice(
        next.some((b) => b.id === book.id)
          ? "Saved to My shelf in this browser."
          : latest.some((b) => b.id === book.id)
            ? "Removed from My shelf."
            : "Your reading list is full.",
      );
    } catch {
      setStorageNotice(
        "Could not save this title. Browser storage is unavailable.",
      );
    }
  }
  const active = books.find((b) => b.id === selected);
  const branchLabel = branches.find((b) => b.id === branch)?.name;
  const available = (b: ResultBook) =>
    b.availability.some(
      (h) => (!branch || h.branch === branch) && h.status === "available",
    );
  const groups = branch
    ? [
        {
          title: `Available now at ${branchLabel || branch}`,
          books: books.filter(available),
        },
        {
          title: "Other matches · no available copy confirmed here",
          books: books.filter((b) => !available(b)),
        },
      ].filter((g) => g.books.length)
    : [
        {
          title: anchor
            ? "Connected by catalog subjects"
            : "Your discovery shelf",
          books,
        },
      ];
  const subjects = [...new Set(books.flatMap((b) => b.subjects))]
    .filter((s) => s.length < 65)
    .slice(0, 5);
  return (
    <main className={styles.explore}>
      <header className={styles.header}>
        <a href="/" className={styles.brand}>
          <BookOpen size={24} /> shelf<span>.</span>
        </a>
        <nav aria-label="Shelf experiences">
          <a href="/" target="_blank" rel="noopener noreferrer">
            Original experience ↗
          </a>
          <span aria-current="page">
            Visual bookshelf <small>Experiment</small>
          </span>
        </nav>
        <a href="/" target="_blank" rel="noopener noreferrer">
          My shelf · {saved.length} ↗
        </a>
      </header>
      <section className={styles.intro} aria-labelledby="explore-title">
        <div>
          <span className={styles.kicker}>FOLLOW A THREAD. FIND A BOOK.</span>
          <h1 id="explore-title">Let curiosity lead.</h1>
        </div>
        <p>
          A title catches your eye. A thought takes you somewhere new.
          <br />
          This shelf changes with you.
        </p>
      </section>
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          void navigate(prompt);
        }}
      >
        <label htmlFor="explore-prompt">Where should we go next?</label>
        <div>
          <input
            ref={input}
            id="explore-prompt"
            value={prompt}
            maxLength={500}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A mystery, a favorite author, something like a book you loved…"
          />
          <button disabled={busy || !prompt.trim()} type="submit">
            {busy ? "Exploring…" : "Explore"}
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
      <div className={styles.controls}>
        <div className={styles.paths} aria-label="Starting paths">
          {["Mystery", "Fantasy", "Science fiction"].map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => void navigate(`I want ${s}`, { fresh: true })}
            >
              {s}
            </button>
          ))}
        </div>
        <label>
          At your library{" "}
          <select
            aria-label="Explore branch"
            value={branch}
            disabled={busy}
            onChange={(e) =>
              void navigate("Update branch", { branch: e.target.value })
            }
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option value={b.id} key={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy}
          onClick={() => {
            setPrompt("");
            void navigate("Explore the collection", {
              fresh: true,
              quiet: true,
              branch: "",
            });
          }}
        >
          Start fresh
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <section
        className={styles.collection}
        aria-busy={busy}
        aria-label="Visual collection"
      >
        <div className={styles.heading}>
          <div>
            <span className={styles.kicker}>
              {source === "koha"
                ? "KOHA SANDBOX · LIVE CATALOG RECORDS"
                : source
                  ? `${source.toUpperCase()} COLLECTION`
                  : "CONNECTING TO YOUR CATALOG"}
            </span>
            <h2>{direction}</h2>
          </div>
          <p role="status">{busy ? "Following your direction…" : change}</p>
        </div>
        <div className={styles.criteria}>
          {preferences.requiredSubjects.map((s) => (
            <span key={s}>Subject: {s}</span>
          ))}
          {preferences.excludedSubjects.map((s) => (
            <span key={s}>Without: {s}</span>
          ))}
          {preferences.format && <span>{preferences.format}</span>}
          {preferences.maxPages !== undefined && (
            <span>Up to {preferences.maxPages} pages</span>
          )}
          {preferences.availability !== "any" && (
            <span>
              {preferences.availability === "only"
                ? "Only available"
                : "Prefer available"}
            </span>
          )}
        </div>
        {anchor && (
          <div className={styles.anchor}>
            <BookOpen />
            <div>
              <small>YOUR STARTING POINT</small>
              <strong>{anchor.title}</strong>
              <span>
                Connections use catalog subjects; similar style or mood is not
                established.
              </span>
            </div>
          </div>
        )}
        {reply && <p className={styles.response}>{reply}</p>}
        {!books.length && !busy && (
          <div className={styles.empty}>
            <h3>No verified matches on this shelf.</h3>
            <p>
              Change your direction above, or start fresh. We won’t substitute
              unrelated books.
            </p>
          </div>
        )}
        {groups.map(
          (group) =>
            group.books.length > 0 && (
              <section
                className={styles.shelf}
                key={group.title}
                aria-label={group.title}
              >
                <h3>
                  {group.title}
                  <span>
                    {group.books.length}{" "}
                    {group.books.length === 1 ? "title" : "titles"}
                  </span>
                </h3>
                <div className={styles.books}>
                  {group.books.map((book) => (
                    <div className={styles.volume} key={book.id}>
                      <div className={styles.art}>
                        <BookCover
                          key={book.selectedRecordId}
                          title={book.title}
                          author={book.author}
                          isbn={coverIsbn(selectedEdition(book)?.record)}
                        />
                      </div>
                      <button
                        className={styles.title}
                        disabled={busy}
                        aria-expanded={selected === book.id}
                        aria-controls="explore-detail"
                        onClick={(e) => {
                          opener.current = e.currentTarget;
                          setSelected(book.id);
                        }}
                      >
                        {book.title}
                        <ArrowRight size={15} />
                      </button>
                      <p>{book.author}</p>
                      <small
                        className={
                          available(book) ? styles.available : styles.unknown
                        }
                      >
                        {available(book)
                          ? branch
                            ? "Available here now"
                            : "Available copies reported"
                          : "Availability not confirmed"}
                      </small>
                    </div>
                  ))}
                </div>
              </section>
            ),
        )}
        {active && (
          <section
            ref={detail}
            tabIndex={-1}
            id="explore-detail"
            className={styles.detail}
            aria-label={`Details for ${active.title}`}
          >
            <div className={styles.detailHeading}>
              <h3>A closer look</h3>
              <button
                aria-label="Close book details"
                onClick={() => {
                  setSelected(undefined);
                  opener.current?.focus();
                }}
              >
                <X size={20} />
              </button>
            </div>
            <BookCard
              book={active}
              index={0}
              saved={saved.some((b) => b.id === active.id)}
              compared={compared.some((b) => b.id === active.id)}
              compareFull={compared.length >= 3}
              busy={busy}
              catalogBranches={branches}
              onSave={() => save(active)}
              onCompare={() =>
                setCompared((previous) =>
                  previous.some((b) => b.id === active.id)
                    ? previous.filter((b) => b.id !== active.id)
                    : previous.length < 3
                      ? [...previous, active]
                      : previous,
                )
              }
              onSimilar={() =>
                void navigate(`More like ${active.title}`, { similar: active })
              }
            />
            <a href="/" target="_blank" rel="noopener noreferrer">
              Open the original experience for account access and holds ↗
            </a>
          </section>
        )}
        {subjects.length > 0 && (
          <div className={styles.subjects}>
            <span>Follow a catalog subject</span>
            {subjects.map((s) => (
              <button
                key={s}
                disabled={busy}
                onClick={() => void navigate(`Find ${s}`, { fresh: true })}
              >
                {s}
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        )}
      </section>
      {compared.length > 0 && (
        <button className={styles.compare} onClick={() => setComparing(true)}>
          Compare selected titles ({compared.length})
        </button>
      )}
      <Comparison
        catalogBranches={branches}
        books={compared}
        open={comparing}
        onClose={() => setComparing(false)}
        onRemove={(id) =>
          setCompared((previous) => previous.filter((b) => b.id !== id))
        }
        onSave={save}
      />
      {storageNotice && (
        <p role="status" className={styles.storage}>
          {storageNotice}
        </p>
      )}
      <footer className={styles.footer}>
        <p>
          Same collection. Another way in.{" "}
          <a href="/" target="_blank" rel="noopener noreferrer">
            Keep exploring the original experience ↗
          </a>
        </p>
        <p>
          Availability is a current observation, not a reservation. Covers use
          catalog ISBNs via Open Library; missing artwork is labeled.
        </p>
        {notices.length > 0 && (
          <details>
            <summary>About these results</summary>
            {notices.map((n, i) => (
              <p key={i}>{n}</p>
            ))}
          </details>
        )}
      </footer>
    </main>
  );
}
