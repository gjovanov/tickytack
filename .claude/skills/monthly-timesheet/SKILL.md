---
name: monthly-timesheet
description: Book a month of ÖBB hours into tickytack.app and into the e069019-Zeiterfassung workbook, with every entry grounded in real JIRA issues, git commits and Claude Code session history. Use when asked to fill in, book, adjust or migrate a timesheet / Zeiterfassung / Stundenaufzeichnung for a month, to reconcile TickyTack against the workbook, or to add a new month sheet to the Zeiterfassung.
---

# Monthly ÖBB timesheet

Produces one month of time entries that reconcile in three places at once:
the **Zeiterfassung workbook** (what ÖBB bills), **tickytack.app** (the working
record), and the **evidence** (JIRA + git + session transcripts).

The rule that makes this worth doing: **every entry traces to something that
actually happened.** Descriptions are real commit subjects and real feedback
items. A day with no commits and no session gets support hours, not invented
development work.

## Inputs you need before starting

| Thing | Where | Notes |
|---|---|---|
| The workbook | SharePoint `/sites/PNA/CEPS/PNABauprojektmanagementplattform/P.CON/e069019-Zeiterfassung.xlsx` | Ask the user to download it; you do not write to SharePoint |
| Target hours | the user | e.g. 142 h. Also ask for absences (vacation/sick) as date ranges |
| JIRA | `jira.oebb.at` in the browser | needs the ÖBB gateway session |
| PCON commits | `C:\dev\pcon_classic` (local clone) | **not** the REST API — see the trap below |
| PCON+ commits | `C:\dev\grox\pcon` (local clone) | this is where the Sync Mechanism lives |
| Session history | `~/.claude/projects/C--dev-pcon-classic`, `C--dev-grox-pcon` | per-day activity windows and the user's own prompts |

Run every script from this skill's `scripts/` directory (it has its own
`package.json` + `exceljs`, so it works from any cwd). Set `TT_REPO` if the
tickytack checkout is not at `C:\dev\gjovanov\tickytack`. Work in a scratch dir,
never in a repo.

## Step 1 — extract and reconcile the workbook

```bash
bun run scripts/extract-workbook.ts <workbook.xlsx> workbook-entries.json
```

Stop if this does not print **"OK — every sheet reconciles with its own SUM formula"**.

Two traps it already handles, both of which silently corrupt totals if ignored —
see `references/workbook.md`:

- Sheets up to `01-2026` have a **`Pause [min.]` column** and compute
  `=(C-B)*24-D/60`; `02-2026` onward drop it. Ignoring the pause overstates every
  older month (09-2024 reads 188 h instead of 168 h).
- Some rows sit on the wrong sheet. `03-2026` rows 25-28 are dated `2026-02-09`
  but belong to `2026-03-09`; the script corrects that explicitly. If a new
  mismatch appears, find the cause — do **not** widen the tolerance.

## Step 2 — refresh JIRA metadata

In a `jira.oebb.at` tab, fetch the issues referenced by the workbook plus any new
ones, and write `scripts/jira-enrich.tsv` (`key<TAB>statusPrio<TAB>summary`).
Status codes `O E A T P C X` map to Offen / in Entwicklung / in Abstimmung /
Bereit-für-Test|Deployed|Bereit-für-Prod / Produktiv / Abgeschlossen /
Abgebrochen; priority `0..3` is Keine / Prio 1-3. `build-import-set.ts` maps
those to the English names the importer classifies on.

Two things to watch:

- **Moved issues.** `PCON-166` → `PCONNXT-7` and `PCON-248` → `PCONNXT-16`;
  `PCON-114` is deleted. **Keep the key the workbook uses.** Remapping merges
  228.5 h / 48.8 h into the wrong ticket.
- JIRA output can trip the tool-result content filter. If a fetch comes back
  `[BLOCKED: Cookie/query string data]`, strip long alphanumeric runs
  (`.replace(/[A-Za-z0-9_-]{16,}/g,'#')`) and pull it in smaller slices.

## Step 3 — gather the evidence

This is the step that decides what goes in the timesheet.

```bash
# commits — ALL branches, both repos, your commits only
cd C:/dev/pcon_classic && git log --all --since=<YYYY-MM-01> --until=<next-month-01> \
  --author="Jovanov\|Goran" --pretty="%ad|%h|%s" --date=format:"%Y-%m-%d|%H:%M" | sort -u

# per-day activity windows from session transcripts
bun run scripts/activity.ts ~/.claude/projects/C--dev-pcon-classic
bun run scripts/activity.ts ~/.claude/projects/C--dev-grox-pcon

# the user's own prompts — feedback rounds, what was asked for, when
bun run scripts/mine.ts <session>.jsonl "Feedback|Testfeedback|<ticket>" 220
```

**Two traps that produced a wrong timesheet the first time:**

1. **Never scope commits from the Bitbucket REST API.** `/rest/api/1.0/.../commits`
   returns the **default branch only**. `pcon_classic` works on `Preview`, so an
   entire `PCON-337-Berich-315` workstream was invisible. Use the local clone
   with `--all`.
2. **`git.oebb.at/PCON/pcon_poc` is dormant** (nothing since May). The PCON+ /
   Sync Mechanism work is in **`github.com/g-rox/pcon`** (`C:\dev\grox\pcon`).
   Concluding "no sync commits this month" from `pcon_poc` is wrong.

Cross-check the commit stream against the activity windows: they should agree on
which days were heavy. Use `mine.ts` to find the *why* — e.g. the Bericht-315
feedback rounds from Regner on 2026-08-24, -25 and -27 each have a matching
commit within hours.

**Report what you found to the user before writing anything.** If the evidence
contradicts what they told you (it did in August — PCONNXT-53 was assumed to
dominate, but half that month's commits were PCON-337), say so plainly and let
them decide.

## Step 4 — author the month

```bash
cp scripts/gen-month.template.ts gen-<YYYY-MM>.ts   # edit MONTH/TARGET/ABSENCE/T/PLAN
bun run gen-<YYYY-MM>.ts month-entries.json
```

Scale each day's hours to its observed activity window and commit density, then
let the template's assertions enforce the rules: exact target total, day cap, no
overlaps, nothing on weekends or absence days, exactly one 1 h Jour Fixe on each
working Wednesday. Day shapes that match the real rhythm:

```
 9.5 h   08:00-12:00  +  12:30-18:00
10.0 h   08:00-12:00  +  12:30-18:30
 8.0 h   09:00-12:00  +  13:00-18:00
Wed      08:00-10:30  +  10:30-11:30 (JF)  +  12:30-18:30
```

## Step 5 — stage and verify before importing

```bash
bun run scripts/build-import-set.ts workbook-entries.json import-set   # projects, tickets, all past months
bun run scripts/build-timesheet-xlsx.ts month-entries.json import-set/months/<YYYY-MM>.xlsx
bun run scripts/verify-staging.ts import-set workbook-entries.json
```

`build-timesheet-xlsx.ts` parses its own output back through the API's real
`parseTimesheetXLSX`, and `verify-staging.ts` re-checks every month plus that
every ticket key resolves. Do not import until it prints **"ALL MONTHS VERIFIED"** —
`importTimeEntries` aborts a whole month on one unknown key.

## Step 6 — import into TickyTack

Order matters: **projects → tickets → months.**

`POST /ticket` auto-generates keys from 100, so it can never produce `PCONNXT-7`.
Tickets must go through `/jira/import/issues-json`, one file per project (the
service infers the project from the first issue's key).

Driving it from the browser, in a tickytack.app tab (see
`references/tickytack-import.md` for the exact snippets):

- Auth is the session cookie — use `fetch(..., {credentials:'include'})`.
  Do **not** try to read `localStorage.ttt_token`; that is blocked as a
  credential read, and it is not needed.
- To get file bytes into the page, inject an `<input type="file">`, put files in
  it with the `file_upload` browser tool, then post them as `FormData` — the
  same shape the real UI uses. Batch ~10 files per upload.
- Always send `replaceExisting=true` for month imports, so re-running is
  idempotent rather than duplicating.

Then verify against the workbook:

```js
// per month: GET /api/org/:org/timeentry?startDate&endDate, sum durationMinutes/60
// expect every month to match month-report.json, and 0 mismatches overall
```

## Step 7 — add the month to the workbook

```bash
bun run scripts/add-month-sheet.ts <workbook.xlsx> month-entries.json <out.xlsx> [YYYY-MM]
```

**Never round-trip this workbook through ExcelJS.** It carries a Microsoft
Purview sensitivity label (`docMetadata/LabelInfo.xml`), 28 drawings with
embedded images, SharePoint `customXml` and printer settings — ExcelJS models
none of them and drops them silently. `add-month-sheet.ts` rewrites the ZIP
instead, copying every untouched part byte-for-byte; it derives the template
sheet, the new sheet/rel ids, the styles and the `Durchschnittlich` /
`Kontingent (Rest)` formula chain from the workbook itself.

Verify, then hand the file to the user — **you do not upload to SharePoint**:

```bash
unzip -t <out.xlsx>                                   # zip integrity
bun run scripts/extract-workbook.ts <out.xlsx> check.json   # all sheets still reconcile
unzip -p <out.xlsx> docMetadata/LabelInfo.xml | grep enabled  # label survived
```

Write the output next to the original in `C:\dev\gjovanov\`, not into a temp
directory. If the target is locked (`EBUSY`), the user has it open in Excel —
write a `-v2` name and say so.

## Known state as of 2026-08-31

- Migrated: 29 months, 878 rows, 4649.50 h; 2 projects, 87 tickets.
- The `2026-02-09` → `2026-03-09` typo is corrected in TickyTack but **still
  present in the workbook**.
- Pre-existing duplicates the workbook bills and TickyTack therefore keeps:
  `2026-02-18` (18 h) and `2026-07-22` (14 h, rows 53/54 duplicate 43/44).
- Deploying tickytack: see `CLAUDE.md`. ArgoCD tracks **master** with automated
  sync; `gitops-pilot` is stale and missing the tier-policy patches.

## References

- `references/workbook.md` — sheet layouts, the Pause trap, the formula chain, known defects
- `references/evidence.md` — repos, branches, session transcript structure, the REST default-branch trap
- `references/tickytack-import.md` — API order, the browser upload recipe, verification queries
