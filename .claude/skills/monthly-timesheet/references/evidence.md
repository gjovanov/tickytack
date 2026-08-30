# Evidence sources

Three independent streams. Each catches something the others miss, and they must
be cross-checked against each other before anything is booked.

## Repositories

| Local | Remote | Branch | Covers |
|---|---|---|---|
| `C:\dev\pcon_classic` | `ssh://git@git.oebb.at:7999/pcon/pcon.git` | **`Preview`** (also `Produktiv`, feature branches) | PCON classic — reports, DB performance, releases |
| `C:\dev\grox\pcon` | `github.com/g-rox/pcon` | `dev` | PCON+ / P.CON-Next — the Sync Mechanism, engine, vl.wave |

**Trap 1 — the REST API lies about scope.** Bitbucket's
`/rest/api/1.0/projects/PCON/repos/pcon/commits` returns the **default branch
only**. `pcon_classic` develops on `Preview`, so a REST scan of August 2026
returned 11 commits and completely missed the `PCON-337-Berich-315` workstream —
which was the month's main PCON work. Always use the local clone:

```bash
git log --all --since=<start> --until=<end> --author="Jovanov\|Goran" \
  --pretty="%ad|%h|%s" --date=format:"%Y-%m-%d|%H:%M" | sort -u
```

**Trap 2 — the obvious PCON+ repo is the wrong one.**
`git.oebb.at/PCON/pcon_poc` has had no commits on any branch since 2026-05-21.
The PCONNXT / Sync Mechanism work lives in `github.com/g-rox/pcon`. Concluding
"no sync work this month" from `pcon_poc` is a false negative.

Commit-message style is a useful signal: `pcon_classic` messages name the
artefact (`Bericht 315: Teilsummen folgen dem Autofilter`), `grox/pcon` messages
name the defect and its cost (`batch-import: create spoke dbs with simple
recovery (332 full-recovery spokes = 203GB log bloat, disk full)`). Both make
good timesheet descriptions as-is.

Version bumps (`PREV: 1.10.7.129`, `Prod update 1.10.14.15`) mark deployment
work — book them against `PCON-284 Releases / Deployment`.

## Claude Code session transcripts

`~/.claude/projects/C--dev-pcon-classic/*.jsonl` and `C--dev-grox-pcon/*.jsonl`.
One JSONL record per event; the useful types are `user` (with
`message.content`) and `last-prompt`.

```bash
bun run scripts/activity.ts ~/.claude/projects/C--dev-pcon-classic
#   2026-08-24 Mo  09:07-19:43  records=405

bun run scripts/mine.ts <session>.jsonl "Feedback|Testfeedback|315" 220
#   [08-24 17:21] P.CON_Test_Bericht 315.eml is latest user feedback to report 315. /Plan fixes
```

`activity.ts` gives the **first and last timestamp per day plus a record count** —
that is the closest thing to a real working window, and it is what hours per day
should be scaled to. `mine.ts` gives the *why*: which feedback arrived when, and
from whom.

Filter noise when mining: `<task-notification`, `## Context Usage`,
`Base directory for this skill`, `<system-reminder`, `Caveat:`.

Sessions also prove absences. August 2026 had no commits **and** no session
records between the 6th and 13th, independently confirming the vacation; the one
commit in that window was authored by `e070510`, not `e069019`.

## Cross-checking

A day should agree across streams before it gets development hours:

| Signal | Reading |
|---|---|
| commits + long session window | heavy day — a 10 h booking is defensible |
| session window, no commits | analysis / coordination — book support, not development |
| neither | do not invent development work; support hours at most, and say so |

Worked example (2026-08): the 17th had a 11:02-23:05 window with 2339 records and
seven commits → 10 h. The 20th had no commits and no session in either repo → 8 h
of `PCON-282 Support Allg.`, flagged to the user as unevidenced.

## JIRA

`jira.oebb.at`, needs the ÖBB gateway session. Projects: `PCON`
("PCON Projektverwaltung", id 30114) and `PCONNXT` ("P.CON-Next", id 40609).

Statuses are German and will **not** map through the importer's English
`STATUS_MAP` on their own — translate before building the import files:

| JIRA | code | English for the importer | TickyTack |
|---|---|---|---|
| Offen | `O` | Open | open |
| in Entwicklung / in Abstimmung / Bereit für Test / Deployed in Test / Bereit für Produktion | `E A T` | In Progress | in_progress |
| Produktiv | `P` | Done | done |
| Abgeschlossen / Abgebrochen | `C X` | Closed | closed |

Priorities `Prio 1/2/3/Keine` → High / Medium / Low / Medium.

**Moved and deleted issues.** `PCON-166` → `PCONNXT-7`, `PCON-248` → `PCONNXT-16`,
`PCON-114` deleted (404). Querying by the old key returns the issue under its
*new* key, so a `key in (...)` search silently returns fewer rows than asked for.
Keep the workbook's key in TickyTack — those keys are what the historical entries
book against, and remapping merges 228.5 h and 48.8 h into the wrong tickets.
Note the move in the ticket description instead.
