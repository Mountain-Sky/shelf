"use client";
import { useState } from "react";
import { coverUrl } from "../ui/covers";

/** Separate keyed state prevents a failed edition image contaminating another edition. */
export function BookCover({
  title,
  author,
  isbn,
}: {
  title: string;
  author: string;
  isbn?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const palette = [...title].reduce((n, c) => n + c.charCodeAt(0), 0) % 7;
  return (
    <>
      <div
        className={`cover cover-${palette} ${loaded ? "has-cover-art" : ""}`}
      >
        <div className="cover-placeholder" aria-hidden="true">
          <span className="cover-series">SHELF · CATALOG RECORD</span>
          <div className="coverTitle">{title}</div>
          <div className="coverAuthor">{author}</div>
        </div>
        {isbn && !failed && (
          <img
            src={coverUrl(isbn)}
            alt={`Cover matched by ISBN for ${title}`}
            className="book-cover-art"
            width={240}
            height={360}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={(e) => {
              if (
                e.currentTarget.naturalWidth <= 1 ||
                e.currentTarget.naturalHeight <= 1
              )
                setFailed(true);
              else setLoaded(true);
            }}
            onError={() => {
              setFailed(true);
              setLoaded(false);
            }}
          />
        )}
      </div>
      <p className="cover-caption">
        {loaded && isbn ? (
          <a
            href={`https://openlibrary.org/isbn/${isbn}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Cover via Open Library · ISBN match
          </a>
        ) : isbn && !failed ? (
          "Cover loading · placeholder shown"
        ) : (
          "Cover unavailable · placeholder"
        )}
      </p>
    </>
  );
}
