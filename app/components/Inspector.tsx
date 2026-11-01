import type { DiscoveryTrace } from "../../lib/types";
export function Inspector({ trace }: { trace: DiscoveryTrace | null }) {
  return (
    <section
      className="labPanel inspector"
      role="region"
      aria-label="Discovery Engine inspector"
    >
      <div className="inspector-heading">
        <span className="eyebrow">BEHIND THE BOOKSHELF</span>
        <h3>Discovery Engine · Developer inspector</h3>
      </div>
      {trace ? (
        <>
          <div className="trace-stats">
            <div>
              <span>Intent</span>
              <strong>{trace.intent.replace("_", " ")}</strong>
            </div>
            <div>
              <span>Retrieved records</span>
              <strong>{trace.candidateCount}</strong>
            </div>
            <div>
              <span>Pipeline</span>
              <strong>{trace.stagesMs.total} ms</strong>
            </div>
          </div>
          <p>
            <strong>Constraints:</strong>{" "}
            {trace.constraints.join(" · ") || "No strict filters"}
          </p>
          <div className="trace-grid">
            <details open>
              <summary>Retrieved candidates</summary>
              <h4 className="sr-only">Retrieved candidates</h4>
              <pre>{JSON.stringify(trace.candidates, null, 2)}</pre>
            </details>
            <details>
              <summary>Model calls and stage timings</summary>
              <pre>
                {JSON.stringify(
                  { modelCalls: trace.modelCalls, stagesMs: trace.stagesMs },
                  null,
                  2,
                )}
              </pre>
            </details>
            <details>
              <summary>Queries, grouping, and holdings</summary>
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
            </details>
            <details>
              <summary>Ranking evidence</summary>
              <pre>
                {trace.ranked
                  .map(
                    (r) => `${r.score} · ${r.title}\n${r.reasons.join("; ")}`,
                  )
                  .join("\n\n")}
              </pre>
            </details>
          </div>
          <p className="provenance-note">
            Request text is omitted from browser diagnostics.{" "}
            {trace.modelCalls.every((c) => c.status === "disabled")
              ? "Model calls: disabled."
              : ""}
          </p>
          {trace.notes.map((n, i) => (
            <p className="trace-note" key={i}>
              {n}
            </p>
          ))}
        </>
      ) : (
        <p>
          Developer inspection is not enabled for this server. The collection
          remains fully usable without it.
        </p>
      )}
    </section>
  );
}
