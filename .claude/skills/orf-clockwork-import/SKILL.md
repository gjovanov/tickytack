---
name: orf-clockwork-import
description: Export time entries and issues from ORF's Atlassian Jira Cloud (orfon.atlassian.net) — where the Clockwork timesheet app stores its data — and import them into the venusart2 org on tickytack.app. Use when asked to sync, export, migrate or refresh ORF / Clockwork / orfon time tracking into TickyTack, or to bring venusart2 up to date with Jira worklogs.
---

# ORF Clockwork → TickyTack (venusart2)

Mirrors ORF Jira worklogs into `venusart2`. Unlike the ÖBB side
(see the `monthly-timesheet` skill), **nothing here is authored** — Clockwork
already holds real start times and durations, so the job is a faithful copy plus
reconciliation, not a reconstruction.

Established 2026-08-31: 141 issues across UT / AUDBSP / IDP, 1578 worklogs,
2893.25 h, 2025-04-10 → 2026-08-31, all 17 months reconciling exactly.

## The key insight

**Clockwork writes standard Jira worklogs.** There is no Clockwork API key and no
Clockwork-specific endpoint to chase — "all calendars since the beginning" is
just every worklog authored by your account, readable through the ordinary Jira
REST API. Clockwork's calendars are views over that same data.

Better still, Clockwork records **real tiled start times** (07:30, 08:30, 09:00 …),
so a worklog maps one-to-one onto a TickyTack entry:
`date + startTime + (startTime + timeSpentSeconds)`. No synthesis needed.

## Setup — credentials

Auth is Atlassian Basic `email:api_token`. Put three files next to
`scripts/export-worklogs.ts` (they are gitignored; never echo them):

```bash
echo -n 'https://orfon.atlassian.net'      > scripts/.atl_base
echo -n 'goran.jovanov.extern@orfnet.at'   > scripts/.atl_email
# token lives in C:\dev\gjovanov\orf.important under "ORF ALTASIAN … TOKEN:"
grep -A4 -i 'ORF ALTASIAN' C:/dev/gjovanov/orf.important \
  | grep -i '^TOKEN:' | sed 's/^TOKEN:[[:space:]]*//' | tr -d '\r\n' > scripts/.atl_token
```

The account email is **not** in `orf.important`. It came from the ORF repo's git
config (`cd C:/dev/orf/ut-ki-portal && git config user.email`). An ATATT token is
~192 chars. Confirm with `/rest/api/3/myself` before doing anything else — a
non-JSON response means auth failed, not that the endpoint is wrong.

## Step 1 — export

```bash
cd scripts
bun run export-worklogs.ts orf                     # everything
bun run export-worklogs.ts orf --since=2026-08-01  # incremental
```

Emits `orf-issues.json` and `orf-worklogs.json`, and prints per-project and
per-month totals plus sanity signals (overlaps, zero-duration logs, days over
10 h). **Keep that month table** — it is what the import gets reconciled against.

Notes on the API:

- `/rest/api/3/search/jql` pages with `nextPageToken` and **does not return a
  total**; loop until the token is absent.
- `worklogAuthor = currentUser()` finds the issues; per-issue
  `/worklog` then gives the entries. Filter on `author.accountId` — an issue can
  carry other people's worklogs.
- `started` is ISO with a local offset (`+0200`/`+0100` across DST). **Use the
  local clock time as recorded** — that is what was entered and what the
  timesheet should show. Do not normalise to UTC.
- Worklog comments are Atlassian Document Format; the exporter flattens them to
  text for the entry description.

## Step 2 — build the import set

```bash
bun run build-import-set.ts orf-issues.json orf-worklogs.json import-set
bun run verify-staging.ts import-set
```

Produces `projects.json`, `tickets-<KEY>.json` (one per project), 
`months/<YYYY-MM>.xlsx` and `month-report.json`, then reconciles the staged rows
against the raw export month by month. `verify-staging.ts` re-parses every month
with the API's **own** `parseTimesheetXLSX` and checks each ticket key resolves.
Do not import unless it prints **"ALL MONTHS VERIFIED"** —
`importTimeEntries` aborts a whole month on a single unknown key.

Jira status categories map to what the importer classifies on:
`done` → Done (or Closed if the name says closed/abgeschlossen/abgebrochen),
`indeterminate` → In Progress, everything else → Open.

## Step 3 — import into venusart2

**You must be logged into TickyTack as a `venusart2` user.** The JWT carries a
fixed `orgId` set at login and every scoped route enforces
`user.orgId !== orgId → 401`; there is **no org-switch endpoint**. Being the
*owner* of venusart2 while logged into venusart is not enough — that was the one
real blocker the first time. `GET /org` lists orgs you *own*
(`findByOwnerId`), which is not the same as the org your session is scoped to;
read `me.org.slug` to know where you actually are.

The venusart2 user is `goran_jovanov_fb5b` (OAuth, role **member**). Role is not
a problem: neither `/jira/import/*` nor `/import/excel` checks it — only
`POST /project` and `POST /ticket` (which we do not use) require admin/manager.

Order is **projects → tickets → months**, and tickets must go through
`/jira/import/issues-json` so keys like `UT-526` survive verbatim — `POST /ticket`
generates its own keys from 100. One tickets file per project; the service infers
the project from the first issue's key.

Upload mechanics are identical to the `monthly-timesheet` skill: work inside a
tickytack.app tab with `credentials:'include'`, inject an `<input type="file">`,
fill it with the `file_upload` browser tool, post as `FormData`, ~10 files per
batch, always `replaceExisting=true` so re-runs are idempotent. Do not attempt to
read `localStorage.ttt_token` — that is blocked and unnecessary.

## Step 4 — verify

```js
// per month from month-report.json
const j = await (await fetch(`/api/org/${org}/timeentry?startDate=${s}&endDate=${e}`,
                             {credentials:'include'})).json()
const hours = j.reduce((a, x) => a + (x.durationMinutes || 0), 0) / 60
```

Expect zero mismatches, and a grand total equal to the export's. Then open the
timesheet and confirm it renders — real ticket keys and Clockwork's own times.

## Things worth knowing

- **The free plan caps projects at 2**, and ORF has three (UT, AUDBSP, IDP). Only
  `POST /project` enforces that; the JSON import path does not, so the import
  succeeds. Flag it rather than relying on it silently.
- **Data quality of the source is good**: at the 2026-08-31 export there were
  0 zero-duration logs, exactly 1 overlapping pair (2025-05-19), no day over
  16 h, and 2 weekend days worked (2025-09-27/28). Overlaps and long days are
  carried through as recorded — this is a mirror, not a correction.
- Worklogs crossing midnight are clipped to 23:59 and reported; there were none
  in the first export.
- The two orgs stay separate: `venusart` holds the ÖBB/PCON data, `venusart2`
  holds ORF. Both are owned by the same account but reached through different
  logins.

## Repeat cadence

Monthly, after the ORF month closes:

```bash
bun run export-worklogs.ts orf --since=<YYYY-MM-01>
bun run build-import-set.ts orf-issues.json orf-worklogs.json import-set
bun run verify-staging.ts import-set
# then import just months/<YYYY-MM>.xlsx with replaceExisting=true
```

Re-importing a month already present is safe — `replaceExisting` deletes that
range first. A full re-export and re-import is also safe, and takes a few minutes.
