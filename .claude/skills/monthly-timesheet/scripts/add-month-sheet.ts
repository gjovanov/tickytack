/**
 * Add one month sheet to the OEBB Zeiterfassung workbook, preserving everything else.
 *
 * The workbook carries a Microsoft Purview sensitivity label
 * (docMetadata/LabelInfo.xml), per-sheet drawings with embedded images,
 * SharePoint customXml parts and printer settings. ExcelJS models none of those,
 * so a read/write round-trip silently drops them. This instead rewrites the ZIP:
 * every untouched part is copied byte-for-byte and only these change:
 *
 *   + xl/worksheets/sheetN.xml            (new, modelled on the newest month sheet)
 *   + xl/worksheets/_rels/sheetN.xml.rels (new)
 *   + xl/drawings/drawingN.xml (+rels)    (new, copy of the template's -> same image)
 *   ~ xl/workbook.xml                     (one <sheet> + 2 definedNames)
 *   ~ xl/_rels/workbook.xml.rels          (one worksheet rel)
 *   ~ [Content_Types].xml                 (2 overrides added, calcChain dropped)
 *   - xl/calcChain.xml                    (removed so Excel recalculates)
 *
 * Layout, styles, the meta block and the TLP footer are all learned from the
 * template sheet rather than hardcoded, so this keeps working as the workbook
 * evolves. New text uses inline strings, so xl/sharedStrings.xml is untouched.
 *
 * Usage: bun run add-month-sheet.ts <srcWorkbook.xlsx> <entries.json> <out.xlsx> [YYYY-MM]
 *   YYYY-MM defaults to the month in entries.json's startDate.
 */
import ExcelJS from 'exceljs'
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, statSync, rmSync } from 'fs'
import { join, relative } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { deflateRawSync, crc32 } from 'node:zlib'

const [, , srcXlsx, entriesPath, outPath, monthArg] = process.argv
if (!srcXlsx || !entriesPath || !outPath) {
  console.error('usage: add-month-sheet.ts <srcWorkbook.xlsx> <entries.json> <out.xlsx> [YYYY-MM]')
  process.exit(1)
}

const input = JSON.parse(readFileSync(entriesPath, 'utf8'))
const rows: any[] = input.entries
const month = monthArg ?? String(input.startDate).slice(0, 7)          // YYYY-MM
const [yyyy, mm] = month.split('-')
const sheetName = `${mm}-${yyyy}`                                       // MM-YYYY, the workbook's convention

// ---------------------------------------------------------------- helpers --
const EPOCH = Date.UTC(1899, 11, 30)
const serial = (d: string) => Math.round((Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - EPOCH) / 86400000)
const frac = (t: string) => { const [h, m] = t.split(':').map(Number); return (h * 60 + m) / 1440 }
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const num = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(17))))
const colLetter = (n: number) => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26 } return s }

// --------------------------------------------- learn the layout from ExcelJS --
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(srcXlsx)
if (wb.worksheets.some((w) => w.name === sheetName)) throw new Error(`workbook already has a "${sheetName}" sheet`)

const cellStr = (c: ExcelJS.Cell): string => {
  const v: any = c.value
  if (v == null) return ''
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((r: any) => r.text).join('')
    if ('result' in v) return String(v.result ?? '')
  }
  return String(v)
}

/** every MM-YYYY sheet of this year, with the cell holding its own SUM total */
interface Prior { name: string; cell: string; hours: number; order: number }
const priors: Prior[] = []
for (const ws of wb.worksheets) {
  const m = ws.name.match(/^(\d{2})-(\d{4})$/)
  if (!m || m[2] !== yyyy) continue
  let found: Prior | null = null
  outer: for (let r = ws.rowCount; r > 1; r--)
    for (let c = 1; c <= Math.min(12, ws.columnCount); c++) {
      const v: any = ws.getRow(r).getCell(c).value
      if (v && typeof v === 'object' && typeof v.formula === 'string' && /^SUM\(/i.test(v.formula) && typeof v.result === 'number') {
        found = { name: ws.name, cell: `${colLetter(c)}${r}`, hours: v.result, order: Number(m[1]) }
        break outer
      }
    }
  if (found) priors.push(found)
}
priors.sort((a, b) => b.order - a.order)     // newest first, matching the workbook's own chain
if (!priors.length) throw new Error(`no ${yyyy} month sheets with a SUM total found — cannot build the chain`)

/** the newest month sheet is the structural template */
const templateName = priors[0].name
const tws = wb.getWorksheet(templateName)!

// header row + column roles, by header text
const HEAD: Record<string, string> = { date: 'datum', start: 'kommen', end: 'gehen', pause: 'pause', activity: 'tätigkeit', area: 'beschreibung', ref: 'jira', hours: 'arbeitszeit', note: 'anmerkung' }
let headerRow = 0
const col: Record<string, number> = {}
for (let r = 1; r <= Math.min(20, tws.rowCount) && !headerRow; r++) {
  const found: Record<string, number> = {}
  for (let c = 1; c <= Math.min(20, tws.columnCount); c++) {
    const h = cellStr(tws.getRow(r).getCell(c)).toLowerCase()
    if (!h) continue
    for (const [k, needle] of Object.entries(HEAD)) if (h.includes(needle) && !(k in found)) found[k] = c
  }
  if ('date' in found && 'start' in found && 'end' in found) { headerRow = r; Object.assign(col, found) }
}
if (!headerRow) throw new Error(`could not locate the header row on the template sheet ${templateName}`)
if (col.pause) throw new Error(`template ${templateName} still has a "Pause [min.]" column — this writer targets the newer layout`)

const KONTINGENT = 1760   // yearly hour budget the workbook's "Kontingent (Rest)" row subtracts from

// ----------------------------------------- read the raw parts out of the zip --
const tmp = mkdtempSync(join(tmpdir(), 'zeit-'))
try {
  execFileSync('unzip', ['-o', '-q', srcXlsx, '-d', tmp])
} catch {
  rmSync(tmp, { recursive: true, force: true })
  throw new Error('could not unzip the workbook — is `unzip` on PATH?')
}

const files = new Map<string, Buffer>()
;(function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else files.set(relative(tmp, p).split('\\').join('/'), readFileSync(p))
  }
})(tmp)
rmSync(tmp, { recursive: true, force: true })
const originalCount = files.size
const txt = (k: string) => files.get(k)!.toString('utf8')

// which sheetN.xml is the template, and what is free?
const wbXmlRaw = txt('xl/workbook.xml')
const relsRaw = txt('xl/_rels/workbook.xml.rels')
const sheetTags = [...wbXmlRaw.matchAll(/<sheet [^>]*\/>/g)].map((m) => m[0])
const tmplTag = sheetTags.find((t) => t.includes(`name="${templateName}"`))
if (!tmplTag) throw new Error(`template sheet ${templateName} not found in workbook.xml`)
const tmplRid = tmplTag.match(/r:id="(rId\d+)"/)![1]
const tmplTarget = relsRaw.match(new RegExp(`Id="${tmplRid}"[^>]*Target="(worksheets/sheet\\d+\\.xml)"`))![1]
const tmplSheetPart = `xl/${tmplTarget}`
const tmplIdx = Number(tmplTarget.match(/sheet(\d+)\.xml/)![1])

const usedSheetNums = [...files.keys()].map((k) => k.match(/^xl\/worksheets\/sheet(\d+)\.xml$/)?.[1]).filter(Boolean).map(Number)
const newIdx = Math.max(...usedSheetNums) + 1
const newRid = 'rId' + (Math.max(...[...relsRaw.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]))) + 1)
const newSheetId = Math.max(...sheetTags.map((t) => Number(t.match(/sheetId="(\d+)"/)![1]))) + 1
const localSheetId = sheetTags.length            // 0-based index of the appended sheet

// ------------------------------------------------- build the new sheet XML --
const tmplXml = txt(tmplSheetPart)
const rowXml = (n: number) => tmplXml.match(new RegExp(`<row r="${n}"[^>]*>(?:(?!</row>).)*</row>|<row r="${n}"[^>]*/>`))?.[0] ?? ''

// meta rows 1..headerRow are copied verbatim; only the "Monat" value is swapped
// for an inline string so sharedStrings.xml stays untouched.
const metaRows: string[] = []
for (let r = 1; r <= headerRow; r++) {
  let x = rowXml(r)
  if (!x) continue
  if (cellStr(tws.getRow(r).getCell(1)).toLowerCase().startsWith('monat')) {
    x = x.replace(/<c r="B\d+"([^>]*?)(?:\s+t="[^"]*")?\s*>(?:(?!<\/c>).)*<\/c>/,
      (mm2, attrs) => `<c r="B${r}"${attrs} t="inlineStr"><is><t>${esc(sheetName)}</t></is></c>`)
  }
  metaRows.push(x)
}

// styles + the activity shared-string index, learned from the template's first data row
const firstData = tws.getRow(headerRow + 1)
const dataXml = rowXml(headerRow + 1)
const styleOf = (c: number) => dataXml.match(new RegExp(`<c r="${colLetter(c)}${headerRow + 1}"([^>]*)`))?.[1]?.match(/s="(\d+)"/)?.[1]
const sty = (c: number) => { const s = styleOf(c); return s ? ` s="${s}"` : '' }
const activitySs = dataXml.match(new RegExp(`<c r="${colLetter(col.activity)}${headerRow + 1}"[^>]*t="s"[^>]*><v>(\\d+)</v>`))?.[1]
const activityCell = (n: number) => activitySs
  ? `<c r="${colLetter(col.activity)}${n}"${sty(col.activity)} t="s"><v>${activitySs}</v></c>`
  : `<c r="${colLetter(col.activity)}${n}"${sty(col.activity)} t="inlineStr"><is><t>${esc(cellStr(firstData.getCell(col.activity)))}</t></is></c>`

const FIRST = headerRow + 1
const sorted = [...rows].sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)))
const lastData = FIRST + sorted.length - 1
const sumEnd = lastData + 1                 // one slack row, as the workbook does
const rGesamt = sumEnd + 1, rAvg = rGesamt + 1, rRest = rGesamt + 2
const C = { d: colLetter(col.date), s: colLetter(col.start), e: colLetter(col.end), r: colLetter(col.ref), h: colLetter(col.hours), n: colLetter(col.note), a: colLetter(col.area) }

const dataRows = sorted.map((r, i) => {
  const n = FIRST + i
  const hours = (frac(r.end) - frac(r.start)) * 24
  const area = r.area ?? (r.projectKey === 'PCONNXT' ? 'PCON+' : 'PCON Support')
  return `<row r="${n}" spans="1:${col.note}">`
    + `<c r="${C.d}${n}"${sty(col.date)}><v>${serial(r.date)}</v></c>`
    + `<c r="${C.s}${n}"${sty(col.start)}><v>${num(frac(r.start))}</v></c>`
    + `<c r="${C.e}${n}"${sty(col.end)}><v>${num(frac(r.end))}</v></c>`
    + activityCell(n)
    + `<c r="${C.a}${n}"${sty(col.area)} t="inlineStr"><is><t>${esc(area)}</t></is></c>`
    + `<c r="${C.r}${n}"${sty(col.ref)} t="inlineStr"><is><t>${esc(r.ticketKey)}</t></is></c>`
    + `<c r="${C.h}${n}"${sty(col.hours)}><f>(${C.e}${n}-${C.s}${n})*24</f><v>${num(hours)}</v></c>`
    + `<c r="${C.n}${n}"${sty(col.note)} t="inlineStr"><is><t xml:space="preserve">${esc(r.description || '')}</t></is></c>`
    + `</row>`
})

// totals block — labels and styles lifted from the template's own totals rows
const tmplTotals: Record<string, { label: string; refStyle: string; hoursStyle: string }> = {}
for (let r = tws.rowCount; r > headerRow; r--) {
  const label = cellStr(tws.getRow(r).getCell(col.ref))
  const kind = /^gesamt/i.test(label) ? 'gesamt' : /^durchschnitt/i.test(label) ? 'avg' : /^kontingent/i.test(label) ? 'rest' : ''
  if (!kind || tmplTotals[kind]) continue
  const x = rowXml(r)
  tmplTotals[kind] = {
    label,
    refStyle: x.match(new RegExp(`<c r="${C.r}${r}"([^>]*)`))?.[1]?.match(/s="(\d+)"/)?.[0] ?? '',
    hoursStyle: x.match(new RegExp(`<c r="${C.h}${r}"([^>]*)`))?.[1]?.match(/s="(\d+)"/)?.[0] ?? '',
  }
}
const tot = (k: string, d: string) => tmplTotals[k]?.label ?? d
const hs = (k: string) => (tmplTotals[k]?.hoursStyle ? ' ' + tmplTotals[k].hoursStyle : '')
const rs = (k: string) => (tmplTotals[k]?.refStyle ? ' ' + tmplTotals[k].refStyle : '')

const monthHours = sorted.reduce((s, r) => s + (frac(r.end) - frac(r.start)) * 24, 0)
const chain = priors.map((p) => `'${p.name}'!${p.cell}`)
const yearHours = monthHours + priors.reduce((s, p) => s + p.hours, 0)

const totalsRows = [
  `<row r="${rGesamt}" spans="1:${col.note}"><c r="${C.r}${rGesamt}"${rs('gesamt')} t="inlineStr"><is><t>${esc(tot('gesamt', 'Gesamt'))}</t></is></c>`
    + `<c r="${C.h}${rGesamt}"${hs('gesamt')}><f>SUM(${C.h}${FIRST}:${C.h}${sumEnd})</f><v>${num(monthHours)}</v></c></row>`,
  `<row r="${rAvg}" spans="1:${col.note}"><c r="${C.r}${rAvg}"${rs('avg')} t="inlineStr"><is><t>${esc(tot('avg', 'Durchschnittlich'))}</t></is></c>`
    + `<c r="${C.h}${rAvg}"${hs('avg')}><f>AVERAGE(${C.h}${rGesamt},${chain.join(',')})</f><v>${num(yearHours / (priors.length + 1))}</v></c></row>`,
  `<row r="${rRest}" spans="1:${col.note}"><c r="${C.r}${rRest}"${rs('rest')} t="inlineStr"><is><t>${esc(tot('rest', 'Kontingent (Rest)'))}</t></is></c>`
    + `<c r="${C.h}${rRest}"${hs('rest')}><f>${KONTINGENT}-${C.h}${rGesamt}-${chain.join('-')}</f><v>${num(KONTINGENT - yearHours)}</v></c></row>`,
]

// keep the template's shell (cols, autoFilter, merges, pageSetup, TLP footer, drawing),
// swap in the new sheetData, dimension and uids.
const uid = (tag: string) => `{${tag}${month.replace('-', '')}-0000-4000-A000-000000000000}`.toUpperCase()
let sheetXml = tmplXml
  .replace(/<sheetData>[\s\S]*<\/sheetData>/, `<sheetData>${[...metaRows, ...dataRows, ...totalsRows].join('')}</sheetData>`)
  .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:${C.n}${rRest}"/>`)
  .replace(/ tabSelected="1"/, '')                                        // only one sheet may be selected
  .replace(/<pane [^>]*\/>/, '<pane ySplit="' + headerRow + '" topLeftCell="A' + FIRST + '" activePane="bottomLeft" state="frozen"/>')
  .replace(/<selection pane="bottomLeft"[^>]*\/>/, `<selection pane="bottomLeft" activeCell="A${FIRST}" sqref="A${FIRST}"/>`)
  .replace(/xr:uid="\{[^}]*\}"/g, () => `xr:uid="${uid('A')}"`)

// ------------------------------------------------------ assemble the package --
files.set(`xl/worksheets/sheet${newIdx}.xml`, Buffer.from(sheetXml, 'utf8'))
const tmplRels = files.get(`xl/worksheets/_rels/sheet${tmplIdx}.xml.rels`)
if (tmplRels) {
  const drawing = tmplRels.toString('utf8').match(/Target="\.\.\/drawings\/(drawing\d+\.xml)"/)?.[1]
  if (drawing) {
    files.set(`xl/drawings/drawing${newIdx}.xml`, files.get(`xl/drawings/${drawing}`)!)
    const dRels = files.get(`xl/drawings/_rels/${drawing}.rels`)
    if (dRels) files.set(`xl/drawings/_rels/drawing${newIdx}.xml.rels`, dRels)
    files.set(`xl/worksheets/_rels/sheet${newIdx}.xml.rels`, Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${newIdx}.xml"/>`
      + '</Relationships>', 'utf8'))
  }
}

let wbXml = wbXmlRaw.replace('</sheets>', `<sheet name="${sheetName}" sheetId="${newSheetId}" r:id="${newRid}"/></sheets>`)
if (wbXml.includes('<definedNames>')) {
  wbXml = wbXml.replace('<definedNames>',
    '<definedNames>'
    + `<definedName name="_xlnm._FilterDatabase" localSheetId="${localSheetId}" hidden="1">'${sheetName}'!$A$${headerRow}:$${C.n}$${headerRow}</definedName>`
    + `<definedName name="_xlnm.Print_Area" localSheetId="${localSheetId}">'${sheetName}'!$A$2:$${C.n}$${rRest}</definedName>`)
}
files.set('xl/workbook.xml', Buffer.from(wbXml, 'utf8'))

files.set('xl/_rels/workbook.xml.rels', Buffer.from(
  relsRaw.replace(/<Relationship Id="rId\d+"[^>]*calcChain[^>]*\/>/, '')
    .replace('</Relationships>',
      `<Relationship Id="${newRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${newIdx}.xml"/></Relationships>`), 'utf8'))

files.set('[Content_Types].xml', Buffer.from(
  txt('[Content_Types].xml')
    .replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/, '')
    .replace('</Types>',
      `<Override PartName="/xl/worksheets/sheet${newIdx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      + (files.has(`xl/drawings/drawing${newIdx}.xml`)
        ? `<Override PartName="/xl/drawings/drawing${newIdx}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>` : '')
      + '</Types>'), 'utf8'))

files.delete('xl/calcChain.xml')

// ------------------------------------------------------------- zip writer ---
const dosTime = (12 << 11) & 0xffff
const dosDate = (((Number(yyyy) - 1980) << 9) | (Number(mm) << 5) | 1) & 0xffff
const locals: Buffer[] = [], centrals: Buffer[] = []
let offset = 0
const names = [...files.keys()].sort((a, b) =>
  a === '[Content_Types].xml' ? -1 : b === '[Content_Types].xml' ? 1 : a.localeCompare(b))

for (const name of names) {
  const raw = files.get(name)!
  const comp = deflateRawSync(raw, { level: 9 })
  const crc = crc32(raw) >>> 0
  const nb = Buffer.from(name, 'utf8')

  const lh = Buffer.alloc(30)
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(8, 8)
  lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc, 14)
  lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22)
  lh.writeUInt16LE(nb.length, 26); lh.writeUInt16LE(0, 28)
  locals.push(lh, nb, comp)

  const ch = Buffer.alloc(46)
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8)
  ch.writeUInt16LE(8, 10); ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc, 16)
  ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28)
  ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36)
  ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42)
  centrals.push(ch, nb)
  offset += lh.length + nb.length + comp.length
}
const cd = Buffer.concat(centrals)
const eocd = Buffer.alloc(22)
eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(names.length, 8); eocd.writeUInt16LE(names.length, 10)
eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16)
writeFileSync(outPath, Buffer.concat([...locals, cd, eocd]))

console.log(`sheet         : ${sheetName}  (template ${templateName}, sheet${newIdx}.xml, ${newRid}, sheetId ${newSheetId})`)
console.log(`rows          : ${sorted.length}  (${FIRST}..${lastData})`)
console.log(`Gesamt        : row ${rGesamt} = SUM(${C.h}${FIRST}:${C.h}${sumEnd}) = ${monthHours.toFixed(2)} h`)
console.log(`Durchschnittl.: row ${rAvg} over ${priors.length + 1} months = ${(yearHours / (priors.length + 1)).toFixed(3)} h`)
console.log(`Kontingent    : row ${rRest} = ${(KONTINGENT - yearHours).toFixed(2)} h of ${KONTINGENT}`)
console.log(`chain         : ${chain.join(' ')}`)
console.log(`parts         : ${originalCount} in -> ${files.size} out`)
console.log(`wrote ${outPath}`)
