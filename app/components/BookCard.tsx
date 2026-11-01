"use client";
import {
  Bookmark,
  BookmarkCheck,
  ArrowUpRight,
  GitCompareArrows,
  Headphones,
  BookOpen,
  Tablet,
  ChevronDown,
} from "lucide-react";
import type { ResultBook } from "../../lib/types";
import { branches } from "../../lib/config/branches";
export const formatName = (format: string) =>
  ({
    print: "Print book",
    "large-print": "Large print",
    audiobook: "Audiobook",
    ebook: "Ebook",
    unknown: "Format unknown",
  })[format] ?? format;
export const branchName = (code: string) =>
  branches.find((b) => b.id === code)?.name ?? code;
export function selectedEdition(book: ResultBook) {
  return (
    book.editions.find(
      (e) =>
        JSON.stringify([e.record.ref.provider, e.record.ref.id]) ===
        book.selectedRecordId,
    ) ?? book.editions[0]
  );
}
export function BookCard({
  book,
  index,
  saved,
  compared,
  compareFull,
  busy,
  onSave,
  onCompare,
  onSimilar,
}: {
  book: ResultBook;
  index: number;
  saved: boolean;
  compared: boolean;
  compareFull: boolean;
  busy: boolean;
  onSave: () => void;
  onCompare: () => void;
  onSimilar: () => void;
}) {
  const palette = [...book.title].reduce((n, c) => n + c.charCodeAt(0), 0) % 7;
  const positive = book.availability.filter((h) => h.status === "available");
  const unknown = book.availability.some((h) => h.status === "unknown");
  const evidence = book.evidence.find((e) => e.field === "subjects");
  const edition = selectedEdition(book);
  const fixture = edition?.record.provenance.kind === "fixture";
  const koha = edition?.record.ref.provider === "koha";
  return (
    <article className="book" aria-label={book.title}>
      <div className={`cover cover-${palette}`} aria-hidden="true">
        <div className="cover-spine" />
        <span className="cover-series">THE DISCOVERY COLLECTION</span>
        <div className="cover-orbit" />
        <div className="coverTitle">{book.title}</div>
        <div className="coverAuthor">{book.author}</div>
        <span className="cover-imprint">
          {fixture ? "shelf editions · demo" : "shelf · placeholder cover"}
        </span>
      </div>
      <button
        className={`cover-save ${saved ? "is-saved" : ""}`}
        aria-label={
          saved
            ? `Remove ${book.title} from your shelf`
            : `Save ${book.title} for later`
        }
        aria-pressed={saved}
        onClick={onSave}
      >
        {saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
      </button>
      <div className="bookContent">
        <div className="bookFormat">
          {book.format === "audiobook" ? (
            <Headphones size={13} />
          ) : book.format === "ebook" ? (
            <Tablet size={13} />
          ) : (
            <BookOpen size={13} />
          )}{" "}
          {formatName(book.format)}
          <span>·</span>
          {book.year ?? "Year unknown"}
        </div>
        <h3>{book.title}</h3>
        <p className="by">{book.author}</p>
        <p className="book-summary">{book.summary}</p>
        {evidence && (
          <p className="match-reason">
            <span /> Catalog subject: {evidence.value}
          </p>
        )}
        <div
          className={`availability-summary ${positive.length ? "has-copies" : unknown ? "is-unknown" : "no-copies"}`}
        >
          <span className="availability-dot" />
          {positive.length
            ? `${fixture ? "Demo copies" : "Available copies reported"} at ${positive.length === 1 ? branchName(positive[0].branch) : `${positive.length} branches`}`
            : unknown
              ? "Some availability is unknown"
              : fixture
                ? "No demo copies at selected branches"
                : "No available copies reported at selected branches"}
        </div>
        <details className="edition-details">
          <summary>
            {book.editions.length > 1
              ? `${book.editions.length} editions & availability`
              : "Edition & availability"}
            <ChevronDown size={14} />
          </summary>
          <div className="holdings">
            {book.availability.map((a) => (
              <span
                key={a.branch}
                className={
                  a.status === "available" ? "available" : "unavailable"
                }
              >
                {a.branch}:{" "}
                {a.status === "unknown"
                  ? "Availability unknown"
                  : `${a.copies} ${fixture ? "demo copies" : "available copies reported"}`}
              </span>
            ))}
          </div>
          {book.editions.map((e) => (
            <div className="edition-row" key={JSON.stringify(e.record.ref)}>
              <strong>{formatName(e.record.format)}</strong>
              <span>
                {e.record.extent?.pages
                  ? `${e.record.extent.pages} pages`
                  : e.record.extent?.minutes
                    ? `${e.record.extent.minutes} minutes`
                    : "Length not supplied"}{" "}
                · {e.record.year ?? "Year unknown"}
              </span>
              <small>
                {e.availability
                  .map((h) => `${branchName(h.branch)}: ${h.status}`)
                  .join(" · ")}
              </small>
            </div>
          ))}
          <p className="provenance-note">
            {edition?.record.provenance.source ?? "Catalog source"} ·{" "}
            {fixture
              ? "Synthetic demo holdings."
              : koha
                ? "Koha sandbox observations, not live LCPL holdings. Availability is not a borrowing or hold guarantee."
                : "Catalog observations. Availability is not a borrowing or hold guarantee."}{" "}
            Refresh your search for the latest observation.
          </p>
        </details>
        <div className="book-actions">
          <button
            className="similar-button"
            onClick={onSimilar}
            disabled={busy}
          >
            More like this <ArrowUpRight size={15} />
          </button>
          <button
            className={`compare-button ${compared ? "is-selected" : ""}`}
            aria-label={`${compared ? "Remove" : "Add"} ${book.title} ${compared ? "from" : "to"} comparison`}
            aria-pressed={compared}
            disabled={!compared && compareFull}
            title="Compare up to three titles"
            onClick={onCompare}
          >
            <GitCompareArrows size={16} />
          </button>
        </div>
        <button className="text-save" onClick={onSave}>
          {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}{" "}
          {saved ? "Saved to your shelf" : "Save for later"}
        </button>
        {book.catalogUrl && (
          <a
            className="catalog-link"
            href={book.catalogUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View source catalog <ArrowUpRight size={13} />
          </a>
        )}
      </div>
      <span className="result-position">
        {String(index + 1).padStart(2, "0")}
      </span>
    </article>
  );
}
