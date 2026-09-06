# ESPN Draft Command Center

A static-host-compatible, browser-based **Manual Mode** draft assistant for Men of Steele in the private ESPN league **Game of Inches**. Version **v0.1.1** is intentionally credential-free: import current rankings, record each ESPN pick manually, and let the canonical local ledger drive availability, rosters, pick timing, and recommendations.

> Draft: Sunday, September 6, 2026 at 8:00 PM Eastern · 10-team snake · Men of Steele picks 4th · 90 seconds per pick.

## Quick start

Requires Node.js 20 or newer. There are no production dependencies.

```bash
npm start
```

Open <http://localhost:4173>. Draft state is stored in this browser's `localStorage`; export JSON backups periodically during the draft.

Run checks:

```bash
npm test
npm run check
```

## Draft workflow

1. Open **League & data** and download the CSV template.
2. Populate it from a current, trusted rankings provider and import it. No rankings are bundled.
3. Confirm draft position **4 of 10**. If the commissioner changes it, update the position; rankings, ledger, and queue remain intact.
4. In **Draft room**, click **Draft** beside the player selected in ESPN—regardless of which team is on the clock.
5. Search/filter the remaining pool, review decision-support reasons, and maintain **My queue**.
6. Use **Pick log** to undo the latest pick or safely correct an earlier selection.
7. Export a JSON backup before the draft and periodically thereafter.

The confirmed selections from position four are **4, 17, 24, 37, 44, 57, 64, 77, 84, 97, 104, 117, 124, 137, 144, and 157**.

## CSV import

The header row is:

```csv
player_name,team,position,overall_rank,positional_rank,tier,adp,projected_points,bye_week,notes,provider_id
```

`player_name`, `team`, `position`, and `overall_rank` are required. Positions are `QB`, `RB`, `WR`, `TE`, `DST` (or `D/ST`), and `K`. All remaining fields are optional and shown as unavailable when omitted. Provider IDs are preserved and preferred as stable player IDs.

The importer reports malformed column counts, missing values, invalid positions/numbers, duplicate player identities, and ambiguous repeated names. Imports with errors do not replace the current board. A successful replacement deliberately clears the old ledger and queue because their player IDs may no longer match; export a backup first if needed.

## Recommendation model

The deterministic application score is **not projected fantasy points**. Overall source rank relative to the current pick is its primary imported-value signal, so the scale remains useful throughout all 16 rounds; ADP is a smaller market-value adjustment that rewards fallers and penalizes reaches. The score also considers starter/bench construction, differentiated positional needs, limited tier cliffs, distance to the user's next pick, and practical roster utility. It treats RB/WR/TE as FLEX-eligible, discounts excess QBs in this one-QB league, respects position maximums, strongly suppresses kickers and D/STs in rounds 1–9, applies a smaller penalty in rounds 10–12, and permits them normally from round 13 onward. Missing data stays missing; the UI can return **HOLD / insufficient data** and never invents survival probabilities.

## Architecture and privacy

- `src/draft-engine.js` owns snake order, the canonical pick ledger, rosters, availability, needs, and recommendations.
- `src/csv.js` validates imported rankings without calling a third party.
- `src/storage.js` owns versioned browser persistence and credential-free backup/restore.
- `src/platform-adapter.js` defines the seam for a future server-side ESPN adapter.
- `src/app.js` renders the manual UI from engine state; it does not create a second draft-state source.

Never put `SWID`, `espn_s2`, raw private-league responses, or credentials in this app, a CSV, a JSON backup, Git, browser code, or GitHub Pages. v0.1.1 neither authenticates to ESPN nor claims live synchronization.

## GitHub Pages deployment

This release uses relative URLs and needs no build step.

1. Push the branch to GitHub and open repository **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the release/default branch and the **`/ (root)`** folder, then click **Save**.
4. Open the published URL shown by Pages and test CSV import plus JSON export/import in that browser.

For a stricter production workflow, deploy the exact tagged `v0.1.1` contents through a Pages Actions workflow. GitHub Pages is public hosting even when draft data remains browser-local; do not include private exports in the repository.

## Known limitations

- Manual pick entry is required; no ESPN login, private-league fetch, or live draft sync is included.
- Data remains on the current browser/device unless exported; localStorage can be cleared by browser privacy settings.
- Rankings quality and freshness depend entirely on the imported provider file.
- Corrections replace the player on an existing pick; team slots remain dictated by the configured snake order.
- Team names other than Men of Steele use numbered placeholders in this release.

## Next scope

Add a small hosted, server-side **read-only ESPN adapter** that accepts an opaque league connection established outside the browser bundle, retrieves league/draft data server-side, normalizes it into the existing adapter contract, and exposes only minimum necessary draft fields to an authenticated user. Keep secrets in a managed server secret store, add CSRF/session protections and redacted audit logging, and preserve Manual Mode as the reliable fallback.

## Reference repository

The requested `marcg129/fantasy-command-center` repository could not be accessed from this environment because the GitHub network tunnel returned HTTP 403. No commit or inaccessible implementation detail is claimed. The concepts named above were implemented independently from the requirements rather than copied or renamed from the Sleeper application.
