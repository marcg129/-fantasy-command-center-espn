# Changelog

All notable changes to this project are documented in this file.

## [0.1.2] - 2026-09-06

### Added

- Protected beta sessions using same-origin validation and signed, expiring, HttpOnly cookies.
- Authenticated Vercel rankings delivery from a server-only compressed environment variable.
- Automatic canonical CSV import for new devices, cached-ranking protection, loading status, and manual fallback.
- A local validated gzip/base64 encoding tool whose private output is ignored by Git.
- Authentication, secret-safety, decoding, cache, and failure-preservation regression tests.

### Security

- Kept access codes, session secrets, rankings payloads, and cookies out of browser storage, URLs, responses, and logs.
- Added private no-store response controls and generic non-sensitive error messages.

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
