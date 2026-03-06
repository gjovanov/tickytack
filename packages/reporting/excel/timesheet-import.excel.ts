import ExcelJS from 'exceljs'

export interface ParsedTimesheetEntry {
  row: number
  date: string
  startTime: string
  endTime: string
  hours: number
  projectKey: string
  ticketKey: string
  summary: string
  description: string
}

export interface ParsedTimesheet {
  userName: string
  startDate: string
  endDate: string
  entries: ParsedTimesheetEntry[]
}

// Known header labels in both locales
const KNOWN_DATE_HEADERS = ['date', 'datum']
const KNOWN_HOURS_HEADERS = ['hours', 'stunden']

function timeFractionToHHmm(fraction: number): string {
  const totalMinutes = Math.round(fraction * 24 * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getCellStringValue(cell: ExcelJS.Cell): string {
  const val = cell.value
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  if (val instanceof Date) return val.toISOString().split('T')[0]
  // ExcelJS rich text
  if (typeof val === 'object' && 'richText' in val) {
    return (val as any).richText.map((r: any) => r.text).join('')
  }
  return String(val)
}

function getCellNumberValue(cell: ExcelJS.Cell): number {
  const val = cell.value
  if (typeof val === 'number') return val
  // ExcelJS converts time fractions to Date objects (Excel epoch 1899-12-30)
  if (val instanceof Date) {
    return (val.getUTCHours() * 60 + val.getUTCMinutes()) / (24 * 60)
  }
  // Formula cell: use the result
  if (val && typeof val === 'object' && 'result' in val) {
    const result = (val as any).result
    if (typeof result === 'number') return result
    if (result instanceof Date) {
      return (result.getUTCHours() * 60 + result.getUTCMinutes()) / (24 * 60)
    }
  }
  return 0
}

export async function parseTimesheetXLSX(
  buffer: Buffer,
): Promise<ParsedTimesheet> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) throw new Error('No worksheet found in the Excel file')

  // Row 1: Title - "Timesheet: Name"
  const titleCell = getCellStringValue(worksheet.getRow(1).getCell(1))
  const userName = titleCell.replace(/^Timesheet:\s*/i, '').trim()
  if (!userName && !titleCell) {
    throw new Error('Invalid file format: row 1 should contain "Timesheet: <name>"')
  }

  // Row 2: Period - "yyyy-MM-dd - yyyy-MM-dd"
  const periodCell = getCellStringValue(worksheet.getRow(2).getCell(1))
  const periodMatch = periodCell.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/)
  if (!periodMatch) {
    throw new Error(`Invalid file format: row 2 should contain the period "yyyy-MM-dd - yyyy-MM-dd", got "${periodCell}"`)
  }
  const startDate = periodMatch[1]
  const endDate = periodMatch[2]

  // Row 4: Headers - validate
  const headerRow = worksheet.getRow(4)
  const firstHeader = getCellStringValue(headerRow.getCell(1)).toLowerCase()
  if (!KNOWN_DATE_HEADERS.includes(firstHeader)) {
    throw new Error(`Invalid file format: expected header row 4 to start with "Date" or "Datum", got "${getCellStringValue(headerRow.getCell(1))}"`)
  }

  // Parse data rows starting from row 5
  const entries: ParsedTimesheetEntry[] = []
  let rowNum = 5
  while (rowNum <= worksheet.rowCount) {
    const row = worksheet.getRow(rowNum)
    const dateVal = row.getCell(1).value
    if (!dateVal) break

    // Check if this is the totals row (column C contains "Hours:" or "Stunden:")
    const colCVal = getCellStringValue(row.getCell(3)).toLowerCase()
    if (KNOWN_HOURS_HEADERS.some((h) => colCVal.includes(h))) break

    // Check for bold font (totals row indicator)
    if (row.getCell(1).font?.bold) break

    const dateStr =
      dateVal instanceof Date
        ? dateVal.toISOString().split('T')[0]
        : String(dateVal)

    const startFraction = getCellNumberValue(row.getCell(2))
    const endFraction = getCellNumberValue(row.getCell(3))
    const hours = getCellNumberValue(row.getCell(4))

    entries.push({
      row: rowNum,
      date: dateStr,
      startTime: timeFractionToHHmm(startFraction),
      endTime: timeFractionToHHmm(endFraction),
      hours: hours || Math.round((endFraction - startFraction) * 24 * 100) / 100,
      projectKey: getCellStringValue(row.getCell(5)),
      ticketKey: getCellStringValue(row.getCell(6)),
      summary: getCellStringValue(row.getCell(7)),
      description: getCellStringValue(row.getCell(8)),
    })

    rowNum++
  }

  return { userName, startDate, endDate, entries }
}
