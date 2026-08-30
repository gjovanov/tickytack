/**
 * Verify every staged month by parsing it with the SAME parser the API uses
 * (packages/reporting/excel/timesheet-import.excel.ts), and confirm every
 * referenced ticket key exists in the tickets-*.json import files — because
 * importTimeEntries() aborts the whole month if one key is unknown.
 *
 * Usage: bun run verify-staging.ts <importSetDir> <workbook-entries.json>
 */
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'

const [, , dir, entriesPath] = process.argv
const { parseTimesheetXLSX } = await import(
  pathToFileURL(process.env.TT_REPO ? process.env.TT_REPO + '/packages/reporting/excel/timesheet-import.excel.ts' : 'C:/dev/gjovanov/tickytack/packages/reporting/excel/timesheet-import.excel.ts').href
)

// keys that will exist in TickyTack after the ticket import
const known = new Set<string>()
for (const f of readdirSync(dir).filter((f) => /^tickets-.*\.json$/.test(f))) {
  const j = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  for (const i of j.issues) known.add(i.key)
}

const wbTotalByMonth = new Map<string, number>()
const wb = JSON.parse(readFileSync(entriesPath, 'utf8'))
for (const e of wb.entries) {
  const m = e.date.slice(0, 7)
  wbTotalByMonth.set(m, (wbTotalByMonth.get(m) ?? 0) + e.hours)
}

const files = readdirSync(join(dir, 'months')).filter((f) => f.endsWith('.xlsx')).sort()
let rows = 0, hours = 0, failures = 0
const missingKeys = new Set<string>()

console.log('month     rows    hours    wb      delta  parse')
for (const f of files) {
  const month = f.replace('.xlsx', '')
  const buf = Buffer.from(readFileSync(join(dir, 'months', f)))
  let parsed: any
  try { parsed = await parseTimesheetXLSX(buf) } catch (err: any) {
    console.log(`${month}   PARSE FAILED: ${err.message}`); failures++; continue
  }
  // mirror importTimeEntries(): duration comes from the HH:MM strings, not e.hours
  const toMin = (t: string) => { const [hh, mm] = t.split(":").map(Number); return hh * 60 + mm }
  const h = parsed.entries.reduce((s: number, e: any) => s + (toMin(e.endTime) - toMin(e.startTime)) / 60, 0)
  const wbh = wbTotalByMonth.get(month) ?? 0
  const isNew = wbh === 0   // month not yet in the workbook (August is created by Phase 3)
  const delta = isNew ? 0 : Math.round((h - wbh) * 100) / 100

  const bad: string[] = []
  for (const e of parsed.entries) {
    if (!e.ticketKey) bad.push(`row ${e.row}: empty ticket`)
    else if (!known.has(e.ticketKey)) { missingKeys.add(e.ticketKey); bad.push(`row ${e.row}: unknown ${e.ticketKey}`) }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) bad.push(`row ${e.row}: bad date ${e.date}`)
    if (toMin(e.endTime) - toMin(e.startTime) <= 0) bad.push(`row ${e.row}: non-positive duration ${e.startTime}-${e.endTime}`)
  }
  if (delta) failures++
  if (bad.length) failures++
  rows += parsed.entries.length; hours += h

  console.log(`${month} ${String(parsed.entries.length).padStart(6)} ${h.toFixed(2).padStart(8)} ${wbh.toFixed(2).padStart(7)} ${String(delta).padStart(7)}  ${bad.length ? 'FAIL: ' + bad.slice(0, 2).join('; ') : isNew ? 'ok (NEW month)' : 'ok'}`)
}

console.log(`\nfiles: ${files.length}   rows: ${rows}   hours: ${hours.toFixed(2)}`)
console.log(`ticket keys referenced and known: ${known.size} in catalogue`)
if (missingKeys.size) console.log(`MISSING TICKET KEYS (${missingKeys.size}): ${[...missingKeys].join(', ')}`)
console.log(failures ? `\n${failures} problem(s) — DO NOT IMPORT` : '\nALL MONTHS VERIFIED — safe to import')
