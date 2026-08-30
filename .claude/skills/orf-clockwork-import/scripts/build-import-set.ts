/**
 * Turn the ORF Jira/Clockwork export into TickyTack import files.
 *
 *   projects.json           -> POST /jira/import/projects-json
 *   tickets-<KEY>.json      -> POST /jira/import/issues-json   (one per project)
 *   months/<YYYY-MM>.xlsx   -> POST /import/excel              (one per month)
 *   month-report.json       -> expected totals, for verification
 *
 * Clockwork writes real start times, so a worklog maps directly onto a TickyTack
 * entry: date + startTime + (startTime + timeSpentSeconds).
 *
 * Usage: bun run build-orf-import.ts <issues.json> <worklogs.json> <outDir>
 */
import ExcelJS from 'exceljs'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const [, , issuesPath, worklogsPath, outDir] = process.argv
if (!issuesPath || !worklogsPath || !outDir) {
  console.error('usage: build-orf-import.ts <issues.json> <worklogs.json> <outDir>')
  process.exit(1)
}
mkdirSync(join(outDir, 'months'), { recursive: true })

const issues: any[] = JSON.parse(readFileSync(issuesPath, 'utf8'))
const worklogs: any[] = JSON.parse(readFileSync(worklogsPath, 'utf8'))

// Jira status -> the names the importer's STATUS_MAP understands
const statusFor = (i: any) =>
  i.statusCategory === 'done' ? (/(closed|abgeschlossen|abgebrochen|cancel)/i.test(i.status || '') ? 'Closed' : 'Done')
  : i.statusCategory === 'indeterminate' ? 'In Progress'
  : 'Open'
const priorityFor = (p?: string) => {
  const s = (p || '').toLowerCase()
  if (/highest|blocker|critical/.test(s)) return 'Highest'
  if (/high|major/.test(s)) return 'High'
  if (/lowest|trivial/.test(s)) return 'Lowest'
  if (/low|minor/.test(s)) return 'Low'
  return 'Medium'
}

// ---- projects -------------------------------------------------------------
const projectNames = new Map<string, string>()
for (const i of issues) if (i.projectKey && !projectNames.has(i.projectKey)) projectNames.set(i.projectKey, i.projectName ?? i.projectKey)
const usedProjects = [...new Set(worklogs.map((w) => w.projectKey))].filter(Boolean).sort()

const projects = usedProjects.map((k, n) => ({
  id: String(80000 + n),
  key: k,
  name: projectNames.get(k) ?? k,
  description: `Imported from ORF Jira/Clockwork (${issues.filter((i) => i.projectKey === k).length} issues)`,
}))
writeFileSync(join(outDir, 'projects.json'), JSON.stringify(projects, null, 2))

// ---- tickets, one file per project ---------------------------------------
const byIssue = new Map<string, number>()
for (const w of worklogs) byIssue.set(w.issueKey, (byIssue.get(w.issueKey) ?? 0) + w.timeSpentSeconds / 3600)

for (const pk of usedProjects) {
  const list = issues.filter((i) => i.projectKey === pk)
    .sort((a, b) => Number(a.key.split('-')[1]) - Number(b.key.split('-')[1]))
  const out = list.map((i) => ({
    id: String(i.id),
    key: i.key,
    fields: {
      summary: String(i.summary ?? i.key).replace(/\s+/g, ' ').trim().slice(0, 200),
      description: `${i.type ?? 'Task'} · ${i.status ?? ''}\nClockwork: ${(byIssue.get(i.key) ?? 0).toFixed(2)} h logged`,
      status: { name: statusFor(i) },
      priority: { name: priorityFor(i.priority) },
    },
  }))
  writeFileSync(join(outDir, `tickets-${pk}.json`),
    JSON.stringify({ issues: out, total: out.length, startAt: 0, maxResults: out.length }, null, 2))
  console.log(`tickets-${pk}.json : ${out.length} issues`)
}

// ---- monthly staging workbooks -------------------------------------------
const summaryOf = new Map(issues.map((i) => [i.key, String(i.summary ?? i.key).replace(/\s+/g, ' ').trim()]))
const frac = (m: number) => m / 1440
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const byMonth = new Map<string, any[]>()
const clipped: string[] = []
for (const w of worklogs) {
  const date = w.started.slice(0, 10)
  const startM = Number(w.started.slice(11, 13)) * 60 + Number(w.started.slice(14, 16))
  let endM = startM + Math.round(w.timeSpentSeconds / 60)
  if (endM > 1439) { clipped.push(`${date} ${hhmm(startM)} +${(w.timeSpentSeconds / 3600).toFixed(2)}h`); endM = 1439 }
  if (endM <= startM) continue
  const m = date.slice(0, 7)
  if (!byMonth.has(m)) byMonth.set(m, [])
  byMonth.get(m)!.push({
    date, start: hhmm(startM), end: hhmm(endM),
    projectKey: w.projectKey, ticketKey: w.issueKey,
    summary: summaryOf.get(w.issueKey) ?? w.issueKey,
    description: (w.comment || '').replace(/\s+/g, ' ').trim(),
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
  ws.columns = [12, 10, 10, 10, 15, 15, 30, 40].map((width) => ({ width }))
  ws.addRow(['Timesheet: Goran Jovanov']).font = { bold: true, size: 14 }
  ws.addRow([`${startDate} - ${endDate}`])
  ws.addRow([])
  ws.addRow(['Date', 'Start', 'End', 'Hours', 'Project', 'Ticket', 'Summary', 'Description']).font = { bold: true }
  for (const r of rows) {
    const [sh, sm] = r.start.split(':').map(Number)
    const [eh, em] = r.end.split(':').map(Number)
    const row = ws.addRow([r.date, frac(sh * 60 + sm), frac(eh * 60 + em), null, r.projectKey, r.ticketKey, r.summary, r.description])
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

  const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const hours = rows.reduce((s, r) => s + (mins(r.end) - mins(r.start)) / 60, 0)
  monthReport.push({ month, rows: rows.length, hours: Math.round(hours * 100) / 100, startDate, endDate })
}
writeFileSync(join(outDir, 'month-report.json'), JSON.stringify(monthReport, null, 2))

// ---- reconcile against the raw export ------------------------------------
const srcByMonth = new Map<string, number>()
for (const w of worklogs) {
  const m = w.started.slice(0, 7)
  srcByMonth.set(m, (srcByMonth.get(m) ?? 0) + w.timeSpentSeconds / 3600)
}
console.log('\nmonth     rows    staged   export   delta')
let bad = 0
for (const m of monthReport) {
  const src = srcByMonth.get(m.month) ?? 0
  const d = Math.round((m.hours - src) * 100) / 100
  if (d) bad++
  console.log(`${m.month} ${String(m.rows).padStart(6)} ${m.hours.toFixed(2).padStart(9)} ${src.toFixed(2).padStart(8)} ${String(d).padStart(7)}${d ? '  <-- MISMATCH' : ''}`)
}
console.log(`\nprojects : ${projects.length}  (${usedProjects.join(', ')})`)
console.log(`tickets  : ${issues.length}`)
console.log(`months   : ${monthReport.length}`)
console.log(`staged   : ${monthReport.reduce((s, m) => s + m.hours, 0).toFixed(2)} h in ${monthReport.reduce((s, m) => s + m.rows, 0)} rows`)
if (clipped.length) { console.log(`\nclipped at midnight (${clipped.length}): ${clipped.slice(0, 5).join('; ')}`) }
console.log(bad ? `\n${bad} month(s) MISMATCH` : '\nall months reconcile with the Clockwork export')
