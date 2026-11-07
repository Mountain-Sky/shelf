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
import { useState } from "react";
import { BookCover } from "./BookCover";
import { coverIsbn } from "../ui/covers";
import type { ResultBook, CatalogBranch } from "../../lib/types";
import { branches } from "../../lib/config/branches";
export const formatName = (format: string) =>
  ({
    print: "Print book",
    "large-print": "Large print",
    audiobook: "Audiobook",
    ebook: "Ebook",
    unknown: "Format unknown",
  })[format] ?? format;
export const branchName = (code: string, list: CatalogBranch[] = branches) =>
  list.find((b) => b.id === code)?.name ?? code;
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
  catalogBranches = branches,
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
  catalogBranches?: CatalogBranch[];
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
  const [locationsExpanded, setLocationsExpanded] = useState(false);
  const positive = book.availability.filter((h) => h.status === "available");
  const unknown = book.availability.some((h) => h.status === "unknown");
  const sortedLocations = [...book.availability].sort(
    (a, b) =>
      (({ available: 0, unknown: 1, unavailable: 2 })[a.status] ?? 2) -
      ({ available: 0, unknown: 1, unavailable: 2 }[b.status] ?? 2),
  );
  const previewLocations =
    book.availability.length === 1
      ? book.availability
      : positive.length
        ? positive.slice(0, 2)
        : sortedLocations.filter((a) => a.status === "unknown").slice(0, 1);
  const visibleLocations = locationsExpanded
    ? sortedLocations
    : previewLocations;
  const evidence = book.evidence.find((e) => e.field === "subjects");
  const edition = selectedEdition(book);
  const fixture = edition?.record.provenance.kind === "fixture";
  const koha = edition?.record.ref.provider === "koha";
  return (
    <article className="book" aria-label={book.title}>
      <BookCover
        key={book.selectedRecordId + (coverIsbn(edition?.record) ?? "")}
        title={book.title}
        author={book.author}
        isbn={coverIsbn(edition?.record)}
      />
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
            ? `${fixture ? "Demo copies" : "Available copies reported"} at ${positive.length === 1 ? branchName(positive[0].branch, catalogBranches) : `${positive.length} branches`}`
            : unknown
              ? "Some availability is unknown"
              : fixture
                ? "No demo copies at selected branches"
                : "No available copies reported at selected branches"}
        </div>
        <ul
          className={`branch-holdings ${locationsExpanded ? "is-expanded" : ""}`}
          tabIndex={locationsExpanded ? 0 : undefined}
          aria-label="Branch availability"
        >
          {visibleLocations.map((a) => (
            <li key={a.branch} className={`holding-${a.status}`}>
              <strong>{branchName(a.branch, catalogBranches)}</strong>
              <span>
                {a.status === "unknown"
                  ? "Availability unknown"
                  : `${a.copies} ${fixture ? "demo copies" : "available"}`}
              </span>
              <small>
                {a.observedAt && Number.isFinite(Date.parse(a.observedAt)) ? (
                  <>
                    Checked{" "}
                    <time dateTime={a.observedAt}>
                      {new Date(a.observedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </>
                ) : (
                  "Check time unavailable"
                )}
              </small>
            </li>
          ))}
        </ul>
        {positive.length > 0 && unknown && (
          <p className="location-uncertainty">
            Some other locations have unconfirmed availability.
          </p>
        )}
        {book.availability.length > previewLocations.length && (
          <button
            className="locations-toggle"
            aria-expanded={locationsExpanded}
            onClick={() => setLocationsExpanded(!locationsExpanded)}
          >
            {locationsExpanded
              ? "Show fewer locations"
              : `View all ${book.availability.length} locations`}
            <ChevronDown size={14} />
          </button>
        )}
        <details className="edition-details">
          <summary>
            {book.editions.length > 1
              ? `${book.editions.length} editions & availability`
              : "Edition & availability"}
            <ChevronDown size={14} />
          </summary>
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
                  .map(
                    (h) =>
                      `${branchName(h.branch, catalogBranches)}: ${h.status}`,
                  )
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
            disabled={busy || (koha && !book.subjects.length)}
            title={
              koha && !book.subjects.length
                ? "This catalog record has no subject metadata for similarity."
                : undefined
            }
          >
            {koha && !book.subjects.length
              ? "Similarity unavailable"
              : "More like this"}{" "}
            <ArrowUpRight size={15} />
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
