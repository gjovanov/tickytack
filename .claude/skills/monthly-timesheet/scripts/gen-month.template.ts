/**
 * TEMPLATE — copy to gen-<YYYY-MM>.ts and edit PLAN for the month being booked.
 * This is the one file that is authored fresh each month; everything else in the
 * skill is generic.
 *
 * Fill PLAN from the evidence gathered in step 3 of SKILL.md:
 *   - one entry per working day, with explicit blocks
 *   - hours per day scaled to that day's observed activity window + commit density
 *   - descriptions taken from real commit subjects / feedback items, not invented
 *   - a day with no commits and no session gets support hours, not development
 *
 * The assertions at the bottom refuse to emit anything that breaks the rules,
 * so a mistake fails here rather than in the timesheet.
 *
 * Usage: bun run gen-<YYYY-MM>.ts <out.json>
 */
import { writeFileSync } from 'fs'

const OUT = process.argv[2] ?? 'month-entries.json'

// ---- edit these four ------------------------------------------------------
const MONTH = '2026-09'                      // YYYY-MM being booked
const TARGET = 142                           // agreed billable hours for the month
const DAY_CAP = 10                           // max hours on any single day
const ABSENCE: Array<{ from: string; to: string }> = []   // e.g. [{from:'2026-09-07', to:'2026-09-11'}]

/** ticket key -> project + the real JIRA summary (fetch these, do not guess) */
const T: Record<string, { project: string; summary: string }> = {
  'PCONNXT-53': { project: 'PCONNXT', summary: 'Sync Mechanism' },
  'PCON-283':   { project: 'PCON',    summary: 'Meetings' },
  'PCON-282':   { project: 'PCON',    summary: 'Support Allg.' },
}
const JF_TICKET = 'PCON-283'                 // the standing weekly Jour Fixe ticket

type Block = [start: string, end: string, ticket: string, note: string]
const PLAN: Array<{ date: string; blocks: Block[] }> = [
  // { date: '2026-09-01', blocks: [
  //   ['08:00','12:00','PCONNXT-53','<real commit subject or feedback item>'],
  //   ['12:30','18:00','PCON-282','<...>'],
  // ]},
  // Wednesdays carry the JF:
  // { date: '2026-09-02', blocks: [
  //   ['08:00','10:30','PCON-282','...'],
  //   ['10:30','11:30','PCON-283','PCON JF, Abstimmungen'],
  //   ['12:30','18:30','PCONNXT-53','...'],
  // ]},
]

// ---- nothing below here needs editing -------------------------------------
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

interface Row { date: string; start: string; end: string; projectKey: string; ticketKey: string; summary: string; description: string }
const rows: Row[] = []
for (const d of PLAN) {
  if (!d.date.startsWith(MONTH)) throw new Error(`${d.date} is outside ${MONTH}`)
  for (const a of ABSENCE) if (d.date >= a.from && d.date <= a.to) throw new Error(`${d.date} falls inside an absence`)
  const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay()
  if (dow === 0 || dow === 6) throw new Error(`${d.date} is a weekend`)
  for (const [s, e, key, note] of d.blocks) {
    const t = T[key]
    if (!t) throw new Error(`unknown ticket ${key} — add it to T with its real JIRA summary`)
    rows.push({ date: d.date, start: s, end: e, projectKey: t.project, ticketKey: key, summary: t.summary, description: note })
  }
}

rows.sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)))
const dur = (r: Row) => (toMin(r.end) - toMin(r.start)) / 60
const total = rows.reduce((s, r) => s + dur(r), 0)

const byDay = new Map<string, Row[]>()
for (const r of rows) { if (!byDay.has(r.date)) byDay.set(r.date, []); byDay.get(r.date)!.push(r) }

const errs: string[] = []
if (!rows.length) errs.push('PLAN is empty')
if (Math.abs(total - TARGET) > 1e-9) errs.push(`total ${total} != target ${TARGET}`)
for (const [day, rs] of byDay) {
  const h = rs.reduce((s, r) => s + dur(r), 0)
  if (h > DAY_CAP + 1e-9) errs.push(`${day}: ${h} h exceeds the ${DAY_CAP} h cap`)
  let prev = -1
  for (const r of rs) {
    if (dur(r) <= 0) errs.push(`${day}: non-positive block ${r.start}-${r.end}`)
    if (toMin(r.start) < prev) errs.push(`${day}: blocks overlap at ${r.start}`)
    prev = toMin(r.end)
  }
  if (new Date(`${day}T00:00:00Z`).getUTCDay() === 3) {
    const jf = rs.filter((r) => r.ticketKey === JF_TICKET)
    if (jf.length !== 1 || dur(jf[0]) !== 1) errs.push(`${day} is a Wednesday: expected exactly one 1 h JF, got ${jf.length}`)
  }
}
for (const a of ABSENCE)
  for (const [day] of byDay) if (day >= a.from && day <= a.to) errs.push(`${day} is an absence day but has entries`)

if (errs.length) { console.error('CONSTRAINT FAILURES:'); errs.forEach((e) => console.error('  - ' + e)); process.exit(1) }

const [y, m] = MONTH.split('-')
writeFileSync(OUT, JSON.stringify({
  userName: 'Goran Jovanov',
  startDate: `${MONTH}-01`,
  endDate: `${MONTH}-${String(new Date(Date.UTC(+y, +m, 0)).getUTCDate()).padStart(2, '0')}`,
  entries: rows,
}, null, 2))

const byTicket = new Map<string, number>()
for (const r of rows) byTicket.set(r.ticketKey, (byTicket.get(r.ticketKey) ?? 0) + dur(r))

console.log(`working days : ${byDay.size}      entries: ${rows.length}`)
console.log(`TOTAL        : ${total.toFixed(2)} h   (target ${TARGET})`)
console.log(`max per day  : ${Math.max(...[...byDay.values()].map((rs) => rs.reduce((s, r) => s + dur(r), 0))).toFixed(2)} h  (cap ${DAY_CAP})`)
console.log('\nper ticket:')
for (const [k, h] of [...byTicket].sort((a, b) => b[1] - a[1]))
  console.log(`  ${k.padEnd(12)} ${h.toFixed(2).padStart(6)} h  ${((h / total) * 100).toFixed(1).padStart(5)}%  ${T[k].summary.slice(0, 44)}`)
console.log('\nper day:')
for (const [d, rs] of byDay) {
  const dow = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(`${d}T00:00:00Z`).getUTCDay()]
  console.log(`  ${d} ${dow} ${rs.reduce((s, r) => s + dur(r), 0).toFixed(2).padStart(5)} h : ${rs.map((r) => `${r.start}-${r.end} ${r.ticketKey}`).join('  ')}`)
}
console.log(`\nall constraints satisfied — wrote ${OUT}`)
