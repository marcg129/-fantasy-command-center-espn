# Changelog

All notable changes to this project are documented in this file.

## [0.1.1] - 2026-09-06

### Fixed

- Made source rank the primary recommendation-value signal and corrected ADP scoring so later ADPs are treated as reaches rather than rewards.
- Reduced and differentiated empty-starter bonuses, and capped tier-drop influence so they cannot overwhelm clearly superior imported ranks.
- Applied strong early-round K and D/ST penalties even when their starting slots are empty.
- Preserved v0.1.0 browser state while moving persistence to a version-independent storage key.
- Evaluated source rank relative to the current pick so valid round 8, 12, and 16 candidates retain useful scores without weakening early-round ordering.

## [0.1.0] - 2026-09-06

### Added

- Responsive, static-host-compatible ESPN Manual Mode draft room for Game of Inches.
- Confirmed Men of Steele league configuration, fourth-slot snake schedule, and editable draft position.
- Validated CSV rankings import with a downloadable empty template and provider-ID preservation.
- Canonical ledger with fast pick recording, availability, snake teams, roster derivation, undo, and safe correction.
- Explainable recommendations using imported values, needs, scarcity, tiers, pick spacing, and roster utility.
- Persistent reorderable target queue with drafted-player flags.
- Versioned local persistence, credential-free JSON backup/restore, and confirmed full reset.
- Automated draft-engine, CSV, persistence, and backup tests.
- GitHub Pages deployment, privacy, workflow, and architecture documentation.
