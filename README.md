# ESPN Draft Command Center

A browser-based draft assistant for Men of Steele in the private ESPN league **Game of Inches**. Version **v0.1.3** supports configurable **4–20-team snake drafts** and can securely download a server-configured rankings board after beta authentication, while retaining the complete **Manual Mode** workflow. Record each ESPN pick manually and let the canonical local ledger drive availability, rosters, pick timing, and recommendations.

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

1. Open **League & data**. Enter the beta access code to authenticate and automatically load the protected board, or select **Enter Manual Mode** without making a rankings request.
2. For the clearly labeled **Manual fallback**, download the CSV template, populate it from a current trusted provider, and use **Choose CSV**. No rankings are bundled.
3. Select the league's **Team count** (4–20, with convenient 10- and 12-team options), then confirm your draft position. Position choices and the complete snake schedule update immediately. If a smaller league makes the saved position invalid, a new valid position is required.
4. In **Draft room**, click **Draft** beside the player selected in ESPN—regardless of which team is on the clock.
5. Search/filter the remaining pool, review decision-support reasons, and maintain **My queue**.
6. Use **Pick log** to undo the latest pick or safely correct an earlier selection.
7. Export a JSON backup before the draft and periodically thereafter.

For a 12-team draft, round one runs slots **1 through 12**, and round two reverses from slot **12 back to 1** (overall picks 13 through 24). Position 4 therefore selects at **4, 21, 28, 45, ...**; position 12 selects at **12, 13, 36, 37, ...**.

Changing team count before any picks preserves rankings, the queue, other league settings, and all still-present team names. Once picks exist, the app asks for explicit confirmation because a new team count changes snake ownership. Cancelling leaves state untouched; confirming clears only the pick ledger (and therefore derived rosters), preserves rankings, and retains queue entries that still identify imported players. Existing saves without a team count migrate as 10-team leagues under the stable `fcc-espn-state` key and v0.1.0 fallback.

## CSV import

The header row is:

```csv
player_name,team,position,overall_rank,positional_rank,tier,adp,projected_points,bye_week,notes,provider_id
```

`player_name`, `team`, `position`, and `overall_rank` are required. Positions are `QB`, `RB`, `WR`, `TE`, `DST` (or `D/ST`), and `K`. All remaining fields are optional and shown as unavailable when omitted. Provider IDs are preserved and preferred as stable player IDs.

The importer reports malformed column counts, missing values, invalid positions/numbers, duplicate player identities, and ambiguous repeated names. Protected and manual rankings both pass through this same canonical parser. Imports with errors do not replace the current board. A successful manual replacement deliberately clears the old ledger and queue because their player IDs may no longer match; export a backup first if needed.

## Protected rankings setup

Keep all three values in Vercel server-side environment variables; never place them in browser code or commit them. `.env.example` intentionally contains empty placeholders only.

- `BETA_ACCESS_CODE`: the code shared privately with beta testers.
- `SESSION_SECRET`: a long, random signing secret used for eight-hour HttpOnly session cookies.
- `RANKINGS_GZIP_BASE64`: the output of the local encoder below.

Prepare a canonical CSV without modifying it:

```bash
npm run encode-rankings -- path/to/rankings.csv
```

The command validates through `parsePlayerCsv`, writes only `.runtime/rankings-gzip-base64.txt` with mode `0600`, and prints metadata rather than the payload. Copy that file's value into the Vercel environment setting through a secure administrative channel. The source CSV, `.runtime/`, local `.env*` files, and encoded output must remain untracked.

## Recommendation model

The deterministic application score is **not projected fantasy points**. It starts at 20, then adds a source-rank component from 70 down to 10 based on distance from the best currently available imported rank (`70 - min(60, 0.75 × rank distance)`). This keeps source rank primary without making a plausible late-round pool score below zero. Projected points add at most 10.

ADP is neutral within two picks and when missing. A player who has genuinely fallen more than two picks past ADP receives `min(8, 0.75 × excess fall)`; drafting more than two picks ahead receives a bounded `min(12, 0.75 × excess reach)` penalty. Open starter weights are RB/WR 5, TE 2.5, QB 1.5, and K/DST 0; open FLEX utility is RB/WR 2 and TE 1. A tier cliff adds 2.5 only when both adjacent same-position players have tiers. A second QB costs 12, exceeding a position maximum costs 100, and K/DST cost 120 in rounds 1–9, 30 in rounds 10–12, and zero automatically from round 13 onward. Candidates need a valid position and positive source rank; otherwise the UI can return **HOLD / insufficient data**.

Browser saves use the release-independent `fcc-espn-state` key and read the prior `fcc-espn-v0.1.0` key as a fallback. v0.1.3 defaults states that predate the team-count field to 10 teams without discarding cached protected rankings, picks, or queue data; a full reset clears both keys.

## Architecture and privacy

- `src/draft-engine.js` owns snake order, the canonical pick ledger, rosters, availability, needs, and recommendations.
- `src/csv.js` validates imported rankings without calling a third party.
- `src/storage.js` owns versioned browser persistence and credential-free backup/restore.
- `src/platform-adapter.js` defines the seam for a future server-side ESPN adapter.
- `src/app.js` renders protected-loading and manual UI from engine state; it does not create a second draft-state source.
- `api/session.js` authenticates same-origin beta requests and issues signed, expiring cookies; `api/rankings.js` validates the session, bounded gzip payload, and canonical CSV before responding.

Never put `SWID`, `espn_s2`, raw private-league responses, access codes, signing secrets, protected rankings, or credentials in Git, browser code, a JSON backup, or a public host. v0.1.3 does not authenticate to ESPN and does not include ESPN synchronization.

## Preview-first Vercel deployment

The protected endpoints require Vercel serverless functions. Validate in a Preview deployment before considering any Production change:

1. Create the three variables above for the **Preview** environment only.
2. Generate a Preview deployment from the pull request branch. Do not promote it and do not alter Production variables.
3. Open the exact HTTPS Preview URL and test incorrect and correct codes, automatic loading, refresh/cached behavior, and Manual fallback.
4. Test on a phone at the Preview URL, including cookie behavior, scrolling, loading/fallback status, a manual pick, and persistence after refresh.
5. Review Preview logs only for status/operational metadata; the handlers intentionally do not log request bodies, codes, cookies, environment values, or rankings.

Local `npm start` remains suitable for Manual Mode UI work, but its static server does not emulate Vercel functions. Manual CSV import remains fully supported.

## Known limitations

- Manual pick entry is required; no ESPN login, private-league fetch, or ESPN synchronization is included.
- Data remains on the current browser/device unless exported; localStorage can be cleared by browser privacy settings.
- Rankings quality and freshness depend entirely on the imported provider file.
- Corrections replace the player on an existing pick; team slots remain dictated by the configured snake order.
- Newly added team slots use numbered placeholders; existing names are retained when their slots remain in the configured league size.

## Next scope

Add a small hosted, server-side **read-only ESPN adapter** that accepts an opaque league connection established outside the browser bundle, retrieves league/draft data server-side, normalizes it into the existing adapter contract, and exposes only minimum necessary draft fields to an authenticated user. Keep secrets in a managed server secret store, add CSRF/session protections and redacted audit logging, and preserve Manual Mode as the reliable fallback.

## Reference repository

The requested `marcg129/fantasy-command-center` repository could not be accessed from this environment because the GitHub network tunnel returned HTTP 403. No commit or inaccessible implementation detail is claimed. The concepts named above were implemented independently from the requirements rather than copied or renamed from the Sleeper application.
