"use client";
import { useEffect, useRef } from "react";
import { X, Bookmark, GitCompareArrows } from "lucide-react";
import type { ResultBook } from "../../lib/types";
import { formatName, selectedEdition, branchName } from "./BookCard";
export function Comparison({
  books,
  open,
  onClose,
  onRemove,
  onSave,
}: {
  books: ResultBook[];
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onSave: (book: ResultBook) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  return (
    <dialog
      className="comparison-dialog"
      ref={dialog}
      aria-labelledby="comparison-heading"
      onCancel={onClose}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">A LITTLE SIDE-BY-SIDE PERSPECTIVE</p>
          <h2 id="comparison-heading">
            <GitCompareArrows size={25} /> Compare your discoveries
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close comparison"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      <p className="dialog-description">
        Compare the selected editions using their supplied catalog details.
        Missing facts stay unknown.
      </p>
      {books.length ? (
        <div className="comparison-scroll">
          <table>
            <caption className="sr-only">
              Selected book edition comparison
            </caption>
            <thead>
              <tr>
                <th scope="col">Details</th>
                {books.map((book) => (
                  <th scope="col" key={book.id}>
                    <span>{book.title}</span>
                    <button
                      aria-label={`Remove ${book.title} from comparison`}
                      onClick={() => onRemove(book.id)}
                    >
                      <X size={15} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Author</th>
                {books.map((b) => (
                  <td key={b.id}>{b.author}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Format</th>
                {books.map((b) => (
                  <td key={b.id}>{formatName(b.format)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Length</th>
                {books.map((b) => {
                  const e = selectedEdition(b)?.record.extent;
                  return (
                    <td key={b.id}>
                      {e?.pages
                        ? `${e.pages} pages`
                        : e?.minutes
                          ? `${e.minutes} minutes`
                          : "Not supplied"}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row">Subjects</th>
                {books.map((b) => (
                  <td key={b.id}>{b.subjects.join(" · ") || "Not supplied"}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">About the book</th>
                {books.map((b) => (
                  <td key={b.id}>{b.summary}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Demo availability</th>
                {books.map((b) => (
                  <td key={b.id}>
                    {b.availability.map((a) => (
                      <p key={a.branch}>
                        {branchName(a.branch)}:{" "}
                        {a.status === "unknown"
                          ? "unknown"
                          : `${a.copies} demo copies`}
                      </p>
                    ))}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Your reading list</th>
                {books.map((b) => (
                  <td key={b.id}>
                    <button
                      className="secondary-button"
                      onClick={() => onSave(b)}
                    >
                      <Bookmark size={15} /> Save title
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-panel">Choose up to three books to compare.</p>
      )}
      <p className="provenance-note">
        All records, edition details and holdings in this demo are sample data.
        Comparison preserves the observations from when you selected each title.
      </p>
    </dialog>
  );
}
