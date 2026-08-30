/**
 * Build a staging .xlsx in the exact shape packages/reporting/excel/timesheet-import.excel.ts
 * expects, then verify it by parsing it back with that very parser.
 *
 * Usage: bun run build-timesheet-xlsx.ts <entries.json> <out.xlsx>
 *
 * entries.json:
 * { "userName": "Goran Jovanov",
 *   "startDate": "2026-08-01", "endDate": "2026-08-31",
 *   "entries": [ { "date":"2026-08-03","start":"08:00","end":"12:00",
 *                  "projectKey":"PCONNXT","ticketKey":"PCONNXT-53",
 *                  "summary":"...","description":"..." } ] }
 */
import ExcelJS from 'exceljs'
import { readFileSync } from 'fs'
import { pathToFileURL } from 'url'
const { parseTimesheetXLSX } = await import(pathToFileURL(process.env.TT_REPO ? process.env.TT_REPO + '/packages/reporting/excel/timesheet-import.excel.ts' : 'C:/dev/gjovanov/tickytack/packages/reporting/excel/timesheet-import.excel.ts').href)

interface Entry {
  date: string; start: string; end: string
  projectKey: string; ticketKey: string
  summary?: string; description?: string
}
interface Input { userName: string; startDate: string; endDate: string; entries: Entry[] }

const [, , inPath, outPath] = process.argv
if (!inPath || !outPath) { console.error('usage: build-timesheet-xlsx.ts <entries.json> <out.xlsx>'); process.exit(1) }

const input: Input = JSON.parse(readFileSync(inPath, 'utf8'))
const frac = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h * 60 + m) / 1440 }

const wb = new ExcelJS.Workbook()
const ws = wb.addWorksheet('Timesheet')
ws.columns = [12, 10, 10, 10, 15, 15, 30, 30].map((width) => ({ width }))

ws.addRow([`Timesheet: ${input.userName}`]).font = { bold: true, size: 14 }
ws.addRow([`${input.startDate} - ${input.endDate}`])
ws.addRow([])
ws.addRow(['Date', 'Start', 'End', 'Hours', 'Project', 'Ticket', 'Summary', 'Description']).font = { bold: true }

const firstDataRow = 5
// entries must be chronological; the importer preserves file order
const sorted = [...input.entries].sort((a, b) =>
  a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date))

for (const e of sorted) {
  const row = ws.addRow([
    e.date, frac(e.start), frac(e.end), null,
    e.projectKey, e.ticketKey, e.summary ?? '', e.description ?? '',
  ])
  row.getCell(2).numFmt = 'HH:mm'
  row.getCell(3).numFmt = 'HH:mm'
  row.getCell(4).value = { formula: `(C${row.number}-B${row.number})*24` } as any
  row.getCell(4).numFmt = '0.00'
}
const lastDataRow = ws.lastRow!.number

ws.addRow([])
const totals = ws.addRow(['', '', 'Hours:', null, '', '', '', ''])
totals.font = { bold: true }
totals.getCell(4).value = { formula: `SUM(D${firstDataRow}:D${lastDataRow})` } as any
totals.getCell(4).numFmt = '0.00'

await wb.xlsx.writeFile(outPath)

// --- round-trip verification against the real importer -------------------
const parsed = await parseTimesheetXLSX(Buffer.from(readFileSync(outPath)))
const expectHours = sorted.reduce((s, e) => s + (frac(e.end) - frac(e.start)) * 24, 0)
const gotHours = parsed.entries.reduce((s, e) => s + e.hours, 0)

const problems: string[] = []
if (parsed.entries.length !== sorted.length) problems.push(`row count ${parsed.entries.length} != ${sorted.length}`)
if (parsed.startDate !== input.startDate) problems.push(`startDate ${parsed.startDate} != ${input.startDate}`)
if (parsed.endDate !== input.endDate) problems.push(`endDate ${parsed.endDate} != ${input.endDate}`)
if (Math.abs(gotHours - expectHours) > 0.005) problems.push(`hours ${gotHours.toFixed(2)} != ${expectHours.toFixed(2)}`)
sorted.forEach((e, i) => {
  const p = parsed.entries[i]; if (!p) return
  if (p.ticketKey !== e.ticketKey) problems.push(`row ${i + 1}: ticket ${p.ticketKey} != ${e.ticketKey}`)
  if (p.startTime !== e.start || p.endTime !== e.end) problems.push(`row ${i + 1}: ${p.startTime}-${p.endTime} != ${e.start}-${e.end}`)
  if (p.date !== e.date) problems.push(`row ${i + 1}: date ${p.date} != ${e.date}`)
})

const byDay = new Map<string, number>()
for (const e of parsed.entries) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.hours)
const over10 = [...byDay].filter(([, h]) => h > 10 + 1e-9)

console.log(`wrote ${outPath}`)
console.log(`period      : ${parsed.startDate} .. ${parsed.endDate}`)
console.log(`rows        : ${parsed.entries.length}`)
console.log(`total hours : ${gotHours.toFixed(2)}`)
console.log(`days        : ${byDay.size}   max/day: ${Math.max(...byDay.values()).toFixed(2)}`)
if (over10.length) console.log(`!! days over 10h: ${over10.map(([d, h]) => `${d}=${h.toFixed(2)}`).join(', ')}`)
if (problems.length) { console.log('\nROUND-TRIP PROBLEMS:'); problems.forEach((p) => console.log('  - ' + p)); process.exit(1) }
console.log('round-trip verify: OK')
