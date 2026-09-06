# ESPN Draft Command Center

A static frontend with protected automatic rankings for Men of Steele in the private ESPN league **Game of Inches**. Version **v0.1.2** uses Vercel Functions for beta access and rankings delivery while preserving credential-free Manual Mode and CSV import. It does not authenticate to ESPN or synchronize draft activity.

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

## Protected rankings on Vercel

Configure these three server-side variables in Vercel project settings for Preview and Production as appropriate. Do not use client-exposed prefixes and do not put values in tracked files:

- `BETA_ACCESS_CODE` — the private beta code.
- `SESSION_SECRET` — a strong random signing value of at least 32 characters.
- `RANKINGS_GZIP_BASE64` — the encoded output produced by the local tool below.

Create the rankings value without changing the input CSV or printing the payload:

```bash
npm run encode-rankings -- path/to/rankings.csv
```

The tool validates with the same canonical CSV parser used by the browser, then writes `.runtime/rankings-gzip-base64.txt` with owner-only permissions. That directory, local environment files, and the generated filename are ignored by Git. Copy the file contents into the Vercel environment-variable UI; never commit it. Use `vercel` to create a Preview deployment first, verify access and fallback behavior on a phone-sized viewport, and promote separately only after review. This repository does not deploy or modify Production automatically.

On a new browser with no player data, a successful beta session retrieves the protected default CSV automatically. Existing cached or manually imported rankings are used immediately and are not overwritten on refresh. If retrieval or validation fails, the existing rankings, ledger, and queue remain unchanged and **League & data → Manual fallback → Choose CSV** remains available.

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

The deterministic application score is **not projected fantasy points**. It starts at 20, then adds a source-rank component from 70 down to 10 based on distance from the best currently available imported rank (`70 - min(60, 0.75 × rank distance)`). This keeps source rank primary without making a plausible late-round pool score below zero. Projected points add at most 10.

ADP is neutral within two picks and when missing. A player who has genuinely fallen more than two picks past ADP receives `min(8, 0.75 × excess fall)`; drafting more than two picks ahead receives a bounded `min(12, 0.75 × excess reach)` penalty. Open starter weights are RB/WR 5, TE 2.5, QB 1.5, and K/DST 0; open FLEX utility is RB/WR 2 and TE 1. A tier cliff adds 2.5 only when both adjacent same-position players have tiers. A second QB costs 12, exceeding a position maximum costs 100, and K/DST cost 120 in rounds 1–9, 30 in rounds 10–12, and zero automatically from round 13 onward. Candidates need a valid position and positive source rank; otherwise the UI can return **HOLD / insufficient data**.

Browser saves use the release-independent `fcc-espn-state` key. v0.1.2 reads the prior `fcc-espn-v0.1.0` key as a fallback, preserving imported rankings, picks, and queue data during upgrade; a full reset clears both keys.

## Architecture and privacy

- `src/draft-engine.js` owns snake order, the canonical pick ledger, rosters, availability, needs, and recommendations.
- `src/csv.js` validates imported rankings without calling a third party.
- `src/storage.js` owns versioned browser persistence and credential-free backup/restore.
- `src/platform-adapter.js` defines the seam for a future server-side ESPN adapter.
- `src/app.js` renders the manual UI from engine state; it does not create a second draft-state source.
- `api/session.js` validates same-origin beta access requests and issues signed, expiring, HttpOnly session cookies.
- `api/rankings.js` authenticates requests and decodes the server-only compressed CSV without caching it.

Never put `SWID`, `espn_s2`, raw private-league responses, access codes, signing secrets, encoded rankings, or credentials in this app, a JSON backup, Git, browser code, or logs. v0.1.2 neither authenticates to ESPN nor claims live synchronization.

## GitHub Pages deployment

This release uses relative URLs and needs no build step.

1. Push the branch to GitHub and open repository **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the release/default branch and the **`/ (root)`** folder, then click **Save**.
4. Open the published URL shown by Pages and test CSV import plus JSON export/import in that browser.

Protected automatic rankings require Vercel Functions and are not available on a GitHub Pages-only deployment. The static interface and manual CSV fallback remain usable when hosted without the functions.

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
