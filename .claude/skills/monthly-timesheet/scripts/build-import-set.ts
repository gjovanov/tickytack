/**
 * Phase 1 prep — turn workbook-entries.json into the exact files the TickyTack
 * import endpoints consume:
 *   projects.json            -> POST /jira/import/projects-json
 *   tickets-<KEY>.json       -> POST /jira/import/issues-json   (one per project!)
 *   months/<YYYY-MM>.xlsx    -> POST /import/excel              (one per month)
 *
 * Ticket metadata comes from live JIRA (via the CORPLAP-2 tunnel), falling back
 * to workbook-derived text for keys JIRA no longer has:
 *   summary  = real JIRA issue title
 *   status   = real JIRA status, mapped DE -> EN so the importer classifies it
 *
 * Usage: bun run build-import-set.ts <workbook-entries.json> <outDir>
 */
import ExcelJS from 'exceljs'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const [, , entriesPath, outDir] = process.argv
if (!entriesPath || !outDir) { console.error('usage: build-import-set.ts <entries.json> <outDir>'); process.exit(1) }
mkdirSync(join(outDir, 'months'), { recursive: true })

const data = JSON.parse(readFileSync(entriesPath, 'utf8'))
const entries: any[] = data.entries

const PROJECT_NAMES: Record<string, string> = {
  PCON: 'PCON Projektverwaltung',
  PCONNXT: 'P.CON-Next',
}
const RECENT_SHEETS = new Set(['06-2026', '07-2026'])

// Real JIRA metadata (fetched live via the CORPLAP-2 tunnel), keyed by the ticket
// key the WORKBOOK uses. PCON-166/-248 were moved in JIRA to PCONNXT-7/-16 and
// PCON-114 was deleted; we keep the workbook keys so the historical time entries
// still resolve and hours are not silently merged into the new keys.
const ST: Record<string, string> = { O: 'Open', E: 'In Progress', A: 'In Progress', T: 'In Progress', P: 'Done', C: 'Closed', X: 'Closed' }
const PR: Record<string, string> = { '1': 'High', '2': 'Medium', '3': 'Low', '0': 'Medium' }
const jira = new Map<string, { summary: string; status: string; priority: string }>()
for (const line of readFileSync(join(import.meta.dir, 'jira-enrich.tsv'), 'utf8').split(/\r?\n/)) {
  if (!line.trim()) continue
  const [key, code, summary] = line.split('\t')
  jira.set(key, { summary, status: ST[code[0]] ?? 'Open', priority: PR[code[1]] ?? 'Medium' })
}

// ---- ticket catalogue -----------------------------------------------------
interface T {
  key: string; project: string
  notes: Map<string, number>; areas: Set<string>
  recent: boolean; hours: number; first: string; last: string
}
const tickets = new Map<string, T>()
for (const e of entries) {
  for (const raw of e.refs) {
    const key = String(raw).toUpperCase()
    const project = key.replace(/-\d+$/, '')
    let t = tickets.get(key)
    if (!t) {
      t = { key, project, notes: new Map(), areas: new Set(), recent: false, hours: 0, first: e.date, last: e.date }
      tickets.set(key, t)
    }
    const n = (e.note || '').trim()
    if (n) t.notes.set(n, (t.notes.get(n) ?? 0) + 1)
    if (e.area) t.areas.add(e.area)
    if (RECENT_SHEETS.has(e.sheet)) t.recent = true
    t.hours += e.hours / e.refs.length
    if (e.date < t.first) t.first = e.date
    if (e.date > t.last) t.last = e.date
  }
}

function summaryOf(t: T): string {
  const j = jira.get(t.key)?.summary
  if (j) return j
  const ranked = [...t.notes].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
  const best = ranked[0]?.[0]
  const s = (best ?? `${t.project} work item ${t.key}`).replace(/\s+/g, ' ').trim()
  return s.length > 120 ? s.slice(0, 117).replace(/[;,\s]+\S*$/, '') + '...' : s
}

// ---- projects.json --------------------------------------------------------
const projectKeys = [...new Set([...tickets.values()].map((t) => t.project))].sort()
const projects = projectKeys.map((k, i) => ({
  id: k === 'PCON' ? '30114' : '40609',
  key: k,
  name: PROJECT_NAMES[k] ?? k,
  description: `Imported from the OEBB Zeiterfassung workbook (${[...tickets.values()].filter((t) => t.project === k).length} tickets)`,
}))
writeFileSync(join(outDir, 'projects.json'), JSON.stringify(projects, null, 2))

// ---- tickets-<KEY>.json — one file per project ----------------------------
let fileIdx = 0
for (const pk of projectKeys) {
  const list = [...tickets.values()]
    .filter((t) => t.project === pk)
    .sort((a, b) => Number(a.key.split('-')[1]) - Number(b.key.split('-')[1]))
  const issues = list.map((t, i) => ({
    id: String(500000 + fileIdx * 1000 + i),
    key: t.key,
    fields: {
      summary: summaryOf(t),
      description: `Areas: ${[...t.areas].join(' | ')}\nWorkbook activity: ${t.first} .. ${t.last} (${t.hours.toFixed(1)} h)`,
      status: { name: jira.get(t.key)?.status ?? (t.recent ? 'In Progress' : 'Closed') },
      priority: { name: jira.get(t.key)?.priority ?? 'Medium' },
    },
  }))
  writeFileSync(
    join(outDir, `tickets-${pk}.json`),
    JSON.stringify({ issues, total: issues.length, startAt: 0, maxResults: issues.length }, null, 2),
  )
  fileIdx++
  console.log(`tickets-${pk}.json : ${issues.length} issues`)
}

// ---- monthly staging workbooks -------------------------------------------
// An entry citing N tickets is split into N consecutive sub-blocks so per-ticket
// hours match the workbook and no two entries overlap.
const frac = (m: number) => m / 1440
const mins = (t: string) => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm }
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const byMonth = new Map<string, any[]>()
for (const e of entries) {
  const m = e.date.slice(0, 7)
  if (!byMonth.has(m)) byMonth.set(m, [])
  const refs: string[] = e.refs.map((r: string) => String(r).toUpperCase())
  const startM = mins(e.start)
  const totalM = Math.round(e.hours * 60)   // pause already deducted
  const per = Math.floor(totalM / refs.length)
  refs.forEach((key, i) => {
    const s = startM + per * i
    const en = i === refs.length - 1 ? startM + totalM : s + per
    byMonth.get(m)!.push({
      date: e.date, start: hhmm(s), end: hhmm(en),
      projectKey: key.replace(/-\d+$/, ''), ticketKey: key,
      summary: summaryOf(tickets.get(key)!),
      description: e.note || '',
    })
  })
}

const monthReport: any[] = []
for (const [month, rows] of [...byMonth].sort()) {
  rows.sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)))
  const y = Number(month.slice(0, 4)), mo = Number(month.slice(5, 7))
  const startDate = `${month}-01`
  const endDate = `${month}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, '0')}`

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Timesheet')
  ws.columns = [12, 10, 10, 10, 15, 15, 30, 30].map((width) => ({ width }))
  ws.addRow([`Timesheet: Goran Jovanov`]).font = { bold: true, size: 14 }
  ws.addRow([`${startDate} - ${endDate}`])
  ws.addRow([])
  ws.addRow(['Date', 'Start', 'End', 'Hours', 'Project', 'Ticket', 'Summary', 'Description']).font = { bold: true }
  for (const r of rows) {
    const row = ws.addRow([r.date, frac(mins(r.start)), frac(mins(r.end)), null, r.projectKey, r.ticketKey, r.summary, r.description])
    row.getCell(2).numFmt = 'HH:mm'
    row.getCell(3).numFmt = 'HH:mm'
    row.getCell(4).value = { formula: `(C${row.number}-B${row.number})*24` } as any
    row.getCell(4).numFmt = '0.00'
  }
  const last = ws.lastRow!.number
  ws.addRow([])
  const tot = ws.addRow(['', '', 'Hours:', null, '', '', '', ''])
  tot.font = { bold: true }
  tot.getCell(4).value = { formula: `SUM(D5:D${last})` } as any
  tot.getCell(4).numFmt = '0.00'
  await wb.xlsx.writeFile(join(outDir, 'months', `${month}.xlsx`))

  const hours = rows.reduce((s, r) => s + (mins(r.end) - mins(r.start)) / 60, 0)
  monthReport.push({ month, rows: rows.length, hours: Math.round(hours * 100) / 100, startDate, endDate })
}

// reconcile staged hours per month against the workbook sheet totals
const sheetTotalByMonth = new Map<string, number>()
for (const s of data.sheets) {
  const [mm, yyyy] = s.name.split('-')
  sheetTotalByMonth.set(`${yyyy}-${mm}`, s.sheetTotal ?? s.totalHours)
}
console.log('\nmonth     rows   staged   sheet   delta')
let bad = 0
for (const m of monthReport) {
  const st = sheetTotalByMonth.get(m.month)
  const d = st === undefined ? NaN : Math.round((m.hours - st) * 100) / 100
  if (d) bad++
  console.log(`${m.month}  ${String(m.rows).padStart(5)}  ${m.hours.toFixed(2).padStart(7)} ${(st ?? NaN).toFixed(2).padStart(7)} ${String(d).padStart(7)}${d ? '  <-- MISMATCH' : ''}`)
}
writeFileSync(join(outDir, 'month-report.json'), JSON.stringify(monthReport, null, 2))

console.log(`\nprojects : ${projects.length}  (${projectKeys.join(', ')})`)
console.log(`tickets  : ${tickets.size}`)
console.log(`months   : ${monthReport.length}`)
console.log(`staged   : ${monthReport.reduce((s, m) => s + m.hours, 0).toFixed(2)} h in ${monthReport.reduce((s, m) => s + m.rows, 0)} rows`)
console.log(bad ? `\n${bad} month(s) MISMATCH` : '\nall months reconcile with the workbook')
