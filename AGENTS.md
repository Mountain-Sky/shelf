# Shelf work prototype

Read README.md, DESIGN_SYSTEM.md, ARCHITECTURE.md and docs/WORK-HANDOFF.md before making changes. This is a curated Windows export, not the Koha development environment.

Preserve the Visual bookshelf at `/explore` as the default, with the secondary original view at `/classic`. Preserve the shared teal/rust palette, Arial typography and composer. Keep the UI, application, engine and catalog adapter separate. Secrets remain server-side. Do not invent SOAP operations, bibliographic records or availability. Do not reconnect patron operations or deploy without instructions.

Read relevant installed Next.js documentation in node_modules/next/dist/docs before changing framework code; this version may differ from prior Next.js conventions. Run npm run check and relevant browser tests. Validate native Windows behavior before marking it verified. Commit reviewable changes; do not merge automatically.
