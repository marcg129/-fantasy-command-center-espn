# Changelog

All notable changes to this project are documented in this file.

## [0.1.3] - 2026-09-06

### Added

- Added a configurable 4–20-team league size with common 10- and 12-team choices, dynamic draft-position options, and complete team-count-aware snake schedules.
- Added an explicit structural-change confirmation after picks have been recorded.
- Added 10- and 12-team snake, next-pick, migration, backup, preservation, cancellation, and structural-reset regressions.

### Changed

- Team-count changes preserve retained team names, rankings, valid shortlist entries, and other league settings. Confirmed post-pick changes clear only the canonical pick ledger and its derived rosters.
- Legacy states without an explicit team count now migrate to 10 teams while retaining the stable storage key and v0.1.0 fallback.

### Preserved

- Retained v0.1.2 protected rankings loading, authentication, rankings data handling, and the v0.1.1 recommendation weights without changes.

## [0.1.2] - 2026-09-06

### Added

- Added same-origin beta authentication with signed eight-hour HttpOnly sessions and private no-store responses.
- Added authenticated, bounded gzip rankings delivery with canonical CSV validation.
- Added automatic canonical rankings loading, cached-board detection, status details, and a mobile-friendly Manual fallback.
- Added a private local rankings encoder and Preview-first Vercel setup documentation.

### Security

- Kept access codes, session signing material, compressed rankings, request bodies, and cookies server-side and out of logs.
- Added generic error responses, constant-time access-code comparison, signed expiration validation, and a 5 MiB decompression ceiling.

### Preserved

- Retained the v0.1.1 recommendation model, stable `fcc-espn-state` persistence key, v0.1.0 fallback, and manual CSV import without ESPN synchronization.

## [0.1.1] - 2026-09-06

### Fixed

- Made relative source rank the primary recommendation signal while retaining useful candidates through round 16.
- Corrected ADP direction with bounded fall bonuses, bounded reach penalties, and neutral missing ADP.
- Rebalanced starter, FLEX, and tier-cliff weights so positional needs do not overwhelm elite value.
- Applied K/DST penalties consistently in rounds 1–9 and 10–12, with the penalty ending in round 13.
- Migrated future saves to a version-independent key while retaining v0.1.0 reads and clearing both keys on reset.

### Tested

- Added early-order, ADP, tier, K/DST, rounds 8/12/16, HOLD, migration, and reset regressions.

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
