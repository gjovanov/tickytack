/**
 * Export worklogs authored by the token's own account from an Atlassian Jira Cloud site.
 *
 * Clockwork (the Jira timesheet app) writes **standard Jira worklogs**, so the
 * Jira REST API is the authoritative source — there is no need for a separate
 * Clockwork API key, and "all calendars" is simply all of your worklogs.
 *
 * Auth is Basic `email:api_token`. Both are read from files next to this script
 * so the token never appears in a command line, an env dump or a transcript:
 *   .atl_base    e.g. https://orfon.atlassian.net   (optional, default ORF)
 *   .atl_email   the Atlassian account email
 *   .atl_token   the ATATT… API token
 *
 * Usage: bun run export-worklogs.ts <outPrefix> [--since=YYYY-MM-DD]
 * Emits <outPrefix>-issues.json and <outPrefix>-worklogs.json
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const DIR = import.meta.dir
const read = (f: string, fallback?: string) => {
  const p = join(DIR, f)
  if (existsSync(p)) return readFileSync(p, 'utf8').trim()
  if (fallback !== undefined) return fallback
  throw new Error(`missing credential file ${p}`)
}
const BASE = read('.atl_base', 'https://orfon.atlassian.net').replace(/\/$/, '')
const AUTH = 'Basic ' + Buffer.from(`${read('.atl_email')}:${read('.atl_token')}`).toString('base64')

const out = process.argv[2] ?? 'export'
const since = process.argv.find((a) => a.startsWith('--since='))?.split('=')[1]

async function api(path: string): Promise<any> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(BASE + path, { headers: { Authorization: AUTH, Accept: 'application/json' } })
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 1500 * (attempt + 1))); continue }
    const ct = r.headers.get('content-type') ?? ''
    if (!ct.includes('json')) throw new Error(`${path} -> ${r.status} ${ct} (auth or gateway problem?)`)
    const j = await r.json()
    if (!r.ok) throw new Error(`${path} -> ${r.status} ${JSON.stringify(j).slice(0, 200)}`)
    return j
  }
  throw new Error(`${path}: gave up after 5 attempts`)
}

/** Atlassian Document Format -> plain text */
function adfText(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text') return node.text ?? ''
  const kids = Array.isArray(node.content) ? node.content.map(adfText) : []
  return kids.join('') + (node.type === 'paragraph' || node.type === 'listItem' ? '\n' : '')
}

const me = await api('/rest/api/3/myself')
console.log(`site   : ${BASE}`)
console.log(`account: ${me.displayName}  (${me.timeZone})`)
if (since) console.log(`since  : ${since}`)

// ---- 1. every issue this account has logged time on -----------------------
// /rest/api/3/search/jql pages with nextPageToken and does NOT return a total.
const jqlParts = ['worklogAuthor = currentUser()']
if (since) jqlParts.push(`worklogDate >= "${since}"`)
const jql = encodeURIComponent(jqlParts.join(' AND ') + ' ORDER BY key ASC')
const FIELDS = 'summary,status,priority,issuetype,project,created'

const issues: any[] = []
let token: string | undefined
do {
  const page = await api(`/rest/api/3/search/jql?jql=${jql}&maxResults=100&fields=${FIELDS}`
    + (token ? `&nextPageToken=${encodeURIComponent(token)}` : ''))
  issues.push(...(page.issues ?? []))
  token = page.nextPageToken
  process.stdout.write(`\r  issues: ${issues.length}`)
} while (token)
console.log(`\r  issues with my worklogs: ${issues.length}${' '.repeat(20)}`)

// ---- 2. the worklogs on each ---------------------------------------------
const sinceMs = since ? Date.parse(since) : -Infinity
const worklogs: any[] = []
let done = 0
for (const iss of issues) {
  let startAt = 0, total = 0
  do {
    const page = await api(`/rest/api/3/issue/${iss.key}/worklog?startAt=${startAt}&maxResults=1000`)
    total = page.total ?? 0
    for (const w of page.worklogs ?? []) {
      if (w.author?.accountId !== me.accountId) continue          // only mine
      if (Date.parse(w.started) < sinceMs) continue
      worklogs.push({
        id: w.id, issueKey: iss.key, projectKey: iss.fields.project?.key,
        started: w.started,                                        // ISO, local offset preserved
        timeSpentSeconds: w.timeSpentSeconds,
        comment: adfText(w.comment), created: w.created, updated: w.updated,
      })
    }
    startAt += page.maxResults ?? 1000
  } while (startAt < total)
  if (++done % 25 === 0) process.stdout.write(`\r  worklogs: ${worklogs.length} (issue ${done}/${issues.length})`)
}
console.log(`\r  worklogs: ${worklogs.length} across ${issues.length} issues${' '.repeat(20)}`)

worklogs.sort((a, b) => a.started.localeCompare(b.started) || a.issueKey.localeCompare(b.issueKey))

writeFileSync(`${out}-issues.json`, JSON.stringify(issues.map((i) => ({
  id: i.id, key: i.key,
  projectKey: i.fields.project?.key, projectName: i.fields.project?.name,
  summary: i.fields.summary,
  status: i.fields.status?.name, statusCategory: i.fields.status?.statusCategory?.key,
  priority: i.fields.priority?.name, type: i.fields.issuetype?.name,
})), null, 2))
writeFileSync(`${out}-worklogs.json`, JSON.stringify(worklogs, null, 2))

// ---- summary + sanity signals --------------------------------------------
const hours = worklogs.reduce((s, w) => s + w.timeSpentSeconds, 0) / 3600
const byMonth = new Map<string, { n: number; h: number }>()
const byProject = new Map<string, { n: number; h: number }>()
const byDay = new Map<string, any[]>()
for (const w of worklogs) {
  const m = w.started.slice(0, 7), d = w.started.slice(0, 10)
  const bm = byMonth.get(m) ?? { n: 0, h: 0 }; bm.n++; bm.h += w.timeSpentSeconds / 3600; byMonth.set(m, bm)
  const bp = byProject.get(w.projectKey) ?? { n: 0, h: 0 }; bp.n++; bp.h += w.timeSpentSeconds / 3600; byProject.set(w.projectKey, bp)
  if (!byDay.has(d)) byDay.set(d, []); byDay.get(d)!.push(w)
}
let overlaps = 0, zero = 0
const over10: string[] = []
for (const [d, es] of byDay) {
  es.sort((a, b) => a.started.localeCompare(b.started))
  let prevEnd = -1
  for (const e of es) {
    if (e.timeSpentSeconds <= 0) { zero++; continue }
    const s = Number(e.started.slice(11, 13)) * 60 + Number(e.started.slice(14, 16))
    if (s < prevEnd) overlaps++
    prevEnd = Math.max(prevEnd, s + e.timeSpentSeconds / 60)
  }
  const h = es.reduce((s, e) => s + e.timeSpentSeconds, 0) / 3600
  if (h > 10) over10.push(`${d}=${h.toFixed(2)}`)
}

console.log(`\nrange   : ${worklogs[0]?.started.slice(0, 10)} .. ${worklogs.at(-1)?.started.slice(0, 10)}`)
console.log(`total   : ${hours.toFixed(2)} h in ${worklogs.length} worklogs over ${byDay.size} days`)
console.log(`signals : ${overlaps} overlapping pairs, ${zero} zero-duration, ${over10.length} days over 10 h`)
console.log('\nby project:')
for (const [k, v] of [...byProject].sort((a, b) => b[1].h - a[1].h))
  console.log(`  ${k.padEnd(10)} ${v.h.toFixed(2).padStart(9)} h  ${String(v.n).padStart(5)} logs`)
console.log('\nby month:')
for (const [k, v] of [...byMonth].sort())
  console.log(`  ${k}  ${v.h.toFixed(2).padStart(8)} h  ${String(v.n).padStart(4)} logs`)
console.log(`\nwrote ${out}-issues.json and ${out}-worklogs.json`)
