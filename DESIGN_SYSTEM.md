# Shelf design system

## Product direction

All Shelf interfaces share the Loudoun County Public Library-inspired identity established for the original experience. This is Shelf's adopted design system, not a claim that these are official LCPL brand specifications.

The original `/` and experimental `/explore` are two ways into the same product. They may differ in layout, navigation, information density, and how the collection responds. They must not develop separate visual identities. Requests for a cleaner or more modern interface mean improve composition and interaction within this system, unless the user explicitly requests a rebrand.

## Source of truth

`app/interface.css` defines the shared interface tokens, loaded after `app/globals.css` by `app/layout.tsx`. Use these CSS variables in components and route modules; do not override them inside a route or duplicate their hex values. If a genuinely new semantic token is necessary, add it to the shared root and document its purpose here.

| Token                | Current value                | Purpose                                                                              |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| `--sans`             | Arial, Helvetica, sans-serif | All interface typography, including headings, controls, dialogs, and book metadata   |
| `--ink`              | `#263b44`                    | Primary text and headings                                                            |
| `--muted`            | `#52656e`                    | Supporting text, captions, secondary metadata                                        |
| `--green`            | `#326d80`                    | Teal navigation, selection, and secondary actions; the legacy token name is retained |
| `--accent`           | `#ad491b`                    | Rust primary actions and restrained brand accents                                    |
| `--accent-hover`     | `#873813`                    | Primary action hover                                                                 |
| `--paper`            | `#ffffff`                    | Main canvas and white surfaces                                                       |
| `--surface`          | `#f2f6f7`                    | Quiet secondary surfaces and disabled controls                                       |
| `--surface-selected` | `#e6f0f3`                    | Selected states, contextual panels and chips                                         |
| `--line`             | `#cbdbe1`                    | Borders and dividers                                                                 |
| `--radius`           | `4px`                        | Default control radius                                                               |

Avoid route-specific purple/lilac palettes, charcoal primary buttons, cream canvases, system-font substitutions, or serif hero headings. Actual book covers retain their artwork and typography. Labeled cover placeholders may retain the existing shared cover treatment; they are not new UI brand palettes.

## Typography and composition

Use the shared sans-serif family, bold headings, readable body copy, and restrained tracking. Default body text is 14px with approximately 1.6 line height; supporting text is generally 12–14px. Large display headings may scale with viewport width. Avoid tiny essential instructions, repeated taglines, and decorative AI/sparkle symbols.

Let books and useful actions lead. Alternate layouts should improve discovery rather than reproduce the same large cards after every interaction. Preserve the original screen while testing alternatives. Navigation between the experiences must remain visible on desktop and mobile.

## Controls and the visual bookshelf

Both routes use `app/components/DiscoveryComposer.module.css` for the shared multiline composer. It is an intentional shape exception: a rounded 20–24px container and pill-shaped submit button are allowed. Keep its improved structure while using the same typography, rust action, white surface, and teal focus treatment as Shelf. Do not revert it to the original catalog-style input row merely to share the brand.

Keep an accessible label even when visually hidden. Enter submits, Shift+Enter inserts a line, and IME composition must not submit. Provide visible keyboard focus, readable placeholders, clear disabled/loading states, and wrapping layouts down to 320px. Respect reduced-motion preferences.

## Grounded discovery

The UI represents verified Discovery Engine results. Do not invent book identities, cover matches, popularity, genre, suitability, or availability to support a visual concept. Missing cover art must be labeled. Current availability is not a confirmed future pickup or reservation. Empty results must not be filled with unrelated titles.

Keep UI, application service, Discovery Engine, intelligence, and catalog adapters separate. The model can propose interpretations and assessments; the engine owns retrieval, verification, constraints, and final ranking.

## Review before completing UI work

- Check the original and experimental routes; keep changes scoped.
- Verify shared tokens and fonts, including nested details and dialogs.
- Inspect the real rendered screen and narrow layouts; verify navigation and keyboard focus.
- Test behavior affected by the change against the existing Koha sandbox when relevant.
- Preserve the database and unrelated services. Commit reviewable changes; do not merge or deploy without instruction.

Do not add snapshot tests that merely repeat color values. Use visual inspection for cosmetic edits and behavior tests for meaningful interaction changes.
