import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
const dir = process.argv[2]
const { parseTimesheetXLSX } = await import(
  pathToFileURL((process.env.TT_REPO ?? 'C:/dev/gjovanov/tickytack') + '/packages/reporting/excel/timesheet-import.excel.ts').href)
const known = new Set<string>()
for (const f of readdirSync(dir).filter(f => /^tickets-.*\.json$/.test(f)))
  for (const i of JSON.parse(readFileSync(join(dir, f), 'utf8')).issues) known.add(i.key)
const report = JSON.parse(readFileSync(join(dir, 'month-report.json'), 'utf8'))
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
let rows = 0, hours = 0, fail = 0
const missing = new Set<string>()
console.log('month     rows    hours   expect  delta  parse')
for (const m of report) {
  const buf = Buffer.from(readFileSync(join(dir, 'months', `${m.month}.xlsx`)))
  let p: any
  try { p = await parseTimesheetXLSX(buf) } catch (e: any) { console.log(`${m.month}  PARSE FAILED: ${e.message}`); fail++; continue }
  const h = p.entries.reduce((s: number, e: any) => s + (toMin(e.endTime) - toMin(e.startTime)) / 60, 0)
  const bad: string[] = []
  for (const e of p.entries) {
    if (!e.ticketKey) bad.push(`row ${e.row}: empty ticket`)
    else if (!known.has(e.ticketKey)) { missing.add(e.ticketKey); bad.push(`row ${e.row}: unknown ${e.ticketKey}`) }
    if (toMin(e.endTime) - toMin(e.startTime) <= 0) bad.push(`row ${e.row}: non-positive`)
  }
  const d = Math.round((h - m.hours) * 100) / 100
  if (d || bad.length || p.entries.length !== m.rows) fail++
  rows += p.entries.length; hours += h
  console.log(`${m.month} ${String(p.entries.length).padStart(6)} ${h.toFixed(2).padStart(8)} ${m.hours.toFixed(2).padStart(8)} ${String(d).padStart(6)}  ${bad.length ? 'FAIL: ' + bad.slice(0,2).join('; ') : 'ok'}`)
}
console.log(`\nfiles: ${report.length}  rows: ${rows}  hours: ${hours.toFixed(2)}  ticket catalogue: ${known.size}`)
if (missing.size) console.log(`MISSING KEYS: ${[...missing].join(', ')}`)
console.log(fail ? `\n${fail} problem(s) — DO NOT IMPORT` : '\nALL MONTHS VERIFIED — safe to import')
