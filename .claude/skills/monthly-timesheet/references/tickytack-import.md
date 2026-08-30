# Importing into tickytack.app

Org `venusart` (slug `venusart`), user `gjovanov`, role admin.

## Order is mandatory

**projects → tickets → months.** Time entries resolve tickets by key, and
`importTimeEntries` aborts an entire month if a single key is unknown — it does
not import partially.

| Step | Endpoint | Payload |
|---|---|---|
| 1 | `POST /api/org/:org/jira/import/projects-json` | `projects.json` — array of `{id, key, name, description}` |
| 2 | `POST /api/org/:org/jira/import/issues-json` | `tickets-<KEY>.json` — `{issues:[{id, key, fields:{summary, description, status:{name}, priority:{name}}}], total, startAt, maxResults}` — **one file per project** |
| 3 | `POST /api/org/:org/import/excel/preview` | validate a month; returns parsed rows + `existingCount` |
| 4 | `POST /api/org/:org/import/excel` | same file + `replaceExisting=true` |

**Why tickets must go through the JIRA JSON route:** `POST /ticket` generates the
key itself as `{projectKey}-{seq}` starting at 100
(`ticket.controller.ts` → `ticketDao.getNextSequenceNumber`). It cannot produce
`PCONNXT-7`, and `key` is not in the `PUT` schema either. `importIssuesFromJson`
is the only path that preserves keys verbatim.

`issues-json` infers the project from the **first issue's key**, so a file must
never mix projects.

`replaceExisting=true` deletes that user's entries in the file's date range
before inserting, which makes every month import idempotent — safe to re-run.

## Auth from the browser

Work inside a `tickytack.app` tab and use the session cookie:

```js
const me  = await (await fetch('/api/auth/me', {credentials:'include'})).json()
const org = me.user.orgId          // NB: the response is {user, org}, nested
```

Do **not** try to read `localStorage.ttt_token`. It is blocked as a credential
read, and it is unnecessary — the cookie works for every call.

## Getting files into the page

The payloads are far too large to inline into a `javascript_tool` call. Inject a
file input, fill it with the `file_upload` browser tool, then post the `File`
objects as `FormData` — exactly what the real UI does:

```js
document.querySelectorAll('#__ttup').forEach(n => n.remove())
const i = document.createElement('input')
i.type = 'file'; i.id = '__ttup'; i.multiple = true
i.style.cssText = 'position:fixed;top:8px;left:8px;z-index:2147483647;width:320px'
document.body.appendChild(i)

window.__up = async (url, extra) => {
  const out = []
  for (const f of [...document.getElementById('__ttup').files].sort((a,b) => a.name.localeCompare(b.name))) {
    const fd = new FormData(); fd.append('file', f)
    for (const [k, v] of Object.entries(extra || {})) fd.append(k, v)
    const res = await fetch(url, {method:'POST', credentials:'include', body: fd})
    out.push(`${f.name} ${res.status} ${JSON.stringify(await res.json().catch(() => ({}))).slice(0,120)}`)
  }
  return out.join('\n')
}
```

Then `find` the input to get its ref, `file_upload` ~10 files at a time, and call
`window.__up(...)`. Remove `#__ttup` when finished.

## Verifying

```js
// per month, against import-set/month-report.json
const j = await (await fetch(`/api/org/${org}/timeentry?startDate=${s}&endDate=${e}`,
                             {credentials:'include'})).json()
const hours = j.reduce((a, x) => a + (x.durationMinutes || 0), 0) / 60
```

Check the whole set too — a wide range (`2000-01-01`..`2099-12-31`) gives the
grand total, which must move by exactly the delta of whatever you re-imported.

Month-level checks worth running: total matches the workbook, no day over the
cap, no entries on absence days or weekends, and no overlapping blocks
(sort by `startTime`, compare each `start` to the running max `end`).

## Gotcha, fixed 2026-08-30

`t.File({ type: 'application/json' })` made both JSON import endpoints reject
every upload with 422. Elysia validates that by sniffing content with
`file-type`, which identifies formats by magic bytes — JSON has none, so
detection returns `undefined` and validation fails. `.xlsx` was unaffected
because it is a ZIP. Fixed in `b5b8570` by dropping the `type` constraint; the
handlers already parse and shape-check the JSON themselves.

The integration tests call `importProjectsFromJson` / `importIssuesFromJson`
directly as service functions, which is why the HTTP-layer failure shipped. If a
JSON upload starts 422-ing again, check that this fix is actually deployed
before debugging anything else.
