# UX strategy

Status: the bookshelf-first demo is now implemented. Patron research, full accessibility evaluation and final production design remain outstanding.

## Visual discovery first

The primary surface is an evolving collection. A prominent natural-language search/navigation input coexists with conventional title/author search and visible filters. The desktop layout gives most space to books, edition choices, comparisons and discovery trails. Conversation is a compact supporting area for clarifications and explanations. On mobile, preserve results and active criteria without forcing patrons through a long transcript.

Every interaction should explain what changed: selected seed title, preferred branch, format, strict availability, or broader subject. Provide a clear start-over action in the final redesign. Do not hide strict constraints in prose or make patrons reverse-engineer the current query.

## Interaction contracts

| Action                                     | Engine responsibility                           | Experience behavior                                                                       |
| ------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Known-title search                         | Retrieve and prioritize exact evidence          | Show a useful result directly, without manufactured conversation                          |
| Select “more like this”                    | Use an explicit displayed result ID/seed        | Keep the seed visible as an anchor; replace recommendations, not the whole mental context |
| “More like the second one”                 | Resolve last displayed snapshot                 | Acknowledge the selected title; clarify if no unambiguous reference exists                |
| Change branch                              | Reuse goal/filters; recheck holdings            | Preserve discovery context and show observation status                                    |
| Choose audiobook                           | Filter editions, preserve their source records  | Surface the correct format, not a title-level sum of unrelated copies                     |
| “Prefer available” versus “only available” | Rank versus filter                              | Distinguish soft preference and hard filter visibly                                       |
| Compare titles                             | Supply edition facts and evidenced similarities | Align comparable fields; show missing data rather than guesses                            |
| Save a reading list                        | Keep temporary explicit selection               | Clear/remove/copy controls; explain session-only retention                                |
| Weak or empty results                      | Report missing evidence and constraints         | Offer specific broadening or clarification actions, not plausible filler                  |

Explicit per-card selection and a comparison dialog are implemented in the demo. Selection is validated against the server snapshot; comparison retains the selected edition and its observed availability. Natural-language ordinal references remain supported.

## Presentation and trust

Display one work group where trusted relationships exist, with format/edition choices and separate availability. Show why a title matched using evidence that can be inspected. Label all fixtures and synthetic holdings. State unavailable, unknown and stale-derived-unknown clearly. Use recognizable branch names and keep canonical catalog links distinct from any future circulation action.

Do not promise borrowing or create a “Place hold” button until an approved link/workflow is verified. Unknown catalog links remain absent. Patron interest in a topic is not an identity attribute and must not become a permanent profile.

## Accessibility and quality gates

Target WCAG 2.2 AA. Test full keyboard operation, predictable focus after result updates, non-color status indicators, semantic headings and controls, understandable error recovery, reduced motion, zoom/reflow and touch targets. Screen-reader testing must check that updates announce concise changes rather than rereading an entire conversation. The current conversation live region needs this review.

Automated browser checks currently cover basic search/refinement, branch changes, inspection, temporary lists, mobile overflow and errors. They do not establish full accessibility compliance or excellence of the proposed visual design. Conduct manual screen-reader and keyboard sessions before a pilot.

## Current versus next

Current additions keep the existing screen functional against the new engine: versioned session requests, centrally configured branches, notices, opt-in diagnostics and an edition disclosure. The demo now includes the visual bookshelf, comparisons, a compact discovery trail, type-based illustrative covers, and responsive transitions. Undoable trail navigation and source-supported official covers remain future work. Do not preserve the existing chat-first layout simply because it already exists.
