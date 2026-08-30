/**
 * Phase 0.1b — extract every time entry from the OEBB Zeiterfassung workbook.
 *
 * Two sheet layouts exist; columns are located by header name per sheet:
 *   LAYOUT 1 (04-2024..01-2026): A Datum, B Kommen, C Gehen, D Pause[min],
 *            E Tätigkeit, F Beschreibung, G Jira-Ref, H Arbeitszeit =(C-B)*24-D/60, I Anmerkung
 *   LAYOUT 2 (02-2026..):        A Datum, B Kommen, C Gehen, D Tätigkeit,
 *            E Beschreibung, F Jira-Ref, G Arbeitszeit =(C-B)*24, H Anmerkung
 *
 * Every sheet's computed total is reconciled against that sheet's own SUM() formula.
 * Usage: bun run extract-workbook.ts <xlsx> <out.json>
 */
import ExcelJS from 'exceljs'
import { writeFileSync } from 'fs'

const [, , src, out] = process.argv
if (!src || !out) { console.error('usage: extract-workbook.ts <xlsx> <out.json>'); process.exit(1) }

const str = (c: ExcelJS.Cell): string => {
  const v: any = c.value
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((r: any) => r.text).join('').trim()
    if ('result' in v) return v.result instanceof Date ? v.result.toISOString() : String(v.result ?? '')
    if ('text' in v) return String(v.text).trim()
  }
  return String(v)
}
const dateOf = (c: ExcelJS.Cell): string => {
  const v: any = c.value
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  return ''
}
const timeOf = (c: ExcelJS.Cell): string => {
  const v: any = c.value
  if (v instanceof Date) return `${String(v.getUTCHours()).padStart(2, '0')}:${String(v.getUTCMinutes()).padStart(2, '0')}`
  if (typeof v === 'number') { const m = Math.round(v * 1440); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
  if (typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v)) { const [h, mm] = v.split(':'); return `${h.padStart(2, '0')}:${mm.slice(0, 2)}` }
  return ''
}
const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(src)

const HEADERS: Record<string, string> = {
  date: 'datum', start: 'kommen', end: 'gehen', pause: 'pause', activity: 'tätigkeit',
  area: 'beschreibung', ref: 'jira', hours: 'arbeitszeit', note: 'anmerkung',
}

const sheets: any[] = []
const allEntries: any[] = []
const issues: string[] = []
let emptyRows = 0
const corrections: string[] = []

for (const ws of wb.worksheets) {
  let headerRow = 0
  const col: Record<string, number> = {}
  for (let r = 1; r <= Math.min(20, ws.rowCount); r++) {
    const row = ws.getRow(r)
    const found: Record<string, number> = {}
    for (let c = 1; c <= Math.min(20, ws.columnCount); c++) {
      const h = str(row.getCell(c)).toLowerCase()
      if (!h) continue
      for (const [key, needle] of Object.entries(HEADERS)) if (h.includes(needle) && !(key in found)) found[key] = c
    }
    if ('date' in found && 'start' in found && 'end' in found) { headerRow = r; Object.assign(col, found); break }
  }
  if (!headerRow) { issues.push(`${ws.name}: no header row found`); continue }

  const meta: Record<string, string> = {}
  for (let r = 1; r < headerRow; r++) {
    const k = str(ws.getRow(r).getCell(1)); const v = str(ws.getRow(r).getCell(2))
    if (k) meta[k] = v
  }

  const entries: any[] = []
  let total = 0
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)
    if (/^(gesamt|durchschnittlich|kontingent|summe)/i.test(str(row.getCell(col.ref)))) break
    const date = dateOf(row.getCell(col.date))
    if (!date) continue
    const start = timeOf(row.getCell(col.start))
    const end = timeOf(row.getCell(col.end))
    if (!start || !end) { emptyRows++; continue }   // weekend / non-worked day

    const pauseMin = col.pause ? (Number(str(row.getCell(col.pause))) || 0) : 0
    const hours = (mins(end) - mins(start) - pauseMin) / 60
    if (hours <= 0) { issues.push(`${ws.name} r${r}: non-positive hours (${start}-${end} -${pauseMin}m)`); continue }

    // --- documented source-data correction -------------------------------
    // 03-2026 rows 25-28 are dated 2026-02-09 but sit between 2026-03-06 and
    // 2026-03-10, and 2026-03-09 (Mon) is the only March weekday with no entry.
    // The month digit was mistyped. Correcting keeps both monthly SUMs right.
    let fixedDate = date
    if (ws.name === '03-2026' && date === '2026-02-09' && r >= 25 && r <= 28) {
      fixedDate = '2026-03-09'
      corrections.push(`${ws.name} r${r}: date 2026-02-09 -> 2026-03-09 (month typo)`)
    }

    const refRaw = str(row.getCell(col.ref))
    const e = {
      sheet: ws.name, row: r, date: fixedDate, start, end, pauseMin,
      hours: Math.round(hours * 100) / 100,
      activity: str(row.getCell(col.activity)),
      area: str(row.getCell(col.area)),
      refRaw,
      refs: [...new Set(refRaw.split(/[;,/]+/).map((s) => s.trim()).filter((s) => /^[A-Z][A-Z0-9_]*-\d+$/i.test(s)))],
      note: str(row.getCell(col.note)),
    }
    entries.push(e); allEntries.push(e); total += hours
  }

  // the sheet's own total: the SUM() formula below the data
  let sheetTotal: number | null = null
  outer: for (let r = ws.rowCount; r > headerRow; r--)
    for (let c = 1; c <= Math.min(12, ws.columnCount); c++) {
      const v: any = ws.getRow(r).getCell(c).value
      if (v && typeof v === 'object' && typeof v.formula === 'string' && /^SUM\(/i.test(v.formula) && typeof v.result === 'number') { sheetTotal = v.result; break outer }
    }

  const mine = Math.round(total * 100) / 100
  if (sheetTotal !== null && Math.abs(mine - sheetTotal) > 0.005)
    issues.push(`${ws.name}: TOTAL MISMATCH mine=${mine} sheet=${sheetTotal}`)
  if (sheetTotal === null) issues.push(`${ws.name}: no SUM formula found — total unverified`)

  sheets.push({ name: ws.name, headerRow, layout: col.pause ? 1 : 2, columns: col, meta, entryCount: entries.length, totalHours: mine, sheetTotal })
}

writeFileSync(out, JSON.stringify({ sheets, entries: allEntries, issues, corrections }, null, 2))

console.log(`sheets: ${sheets.length}   entries: ${allEntries.length}   total: ${allEntries.reduce((s, e) => s + e.hours, 0).toFixed(2)} h\n`)
console.log('sheet      lay  entries    hours    SUM    delta')
for (const s of sheets) {
  const d = s.sheetTotal === null ? NaN : Math.round((s.totalHours - s.sheetTotal) * 100) / 100
  console.log(`${s.name.padEnd(10)} L${s.layout} ${String(s.entryCount).padStart(7)}  ${s.totalHours.toFixed(2).padStart(7)} ${(s.sheetTotal ?? NaN).toFixed(2).padStart(7)} ${String(d).padStart(7)}${d ? '  <-- MISMATCH' : ''}`)
}
console.log(`\nskipped weekend/non-worked rows: ${emptyRows}`)
if (issues.length) { console.log(`issues (${issues.length}):`); issues.slice(0, 30).forEach((i) => console.log('  - ' + i)) }
else console.log('OK — every sheet reconciles with its own SUM formula')
console.log(`\nwrote ${out}`)
