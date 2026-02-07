import ExcelJS from 'exceljs'

interface ExportOptions {
  startDate: Date
  endDate: Date
  locale: string
  userName: string
}

const columnHeaders: Record<string, Record<string, string>> = {
  en: {
    date: 'Date',
    project: 'Project',
    ticket: 'Ticket',
    summary: 'Summary',
    start: 'Start',
    end: 'End',
    hours: 'Hours',
    description: 'Description',
  },
  de: {
    date: 'Datum',
    project: 'Projekt',
    ticket: 'Ticket',
    summary: 'Zusammenfassung',
    start: 'Beginn',
    end: 'Ende',
    hours: 'Stunden',
    description: 'Beschreibung',
  },
}

export async function generateTimesheetXLSX(
  entries: Array<{
    _id?: string
    date: Date | string
    projectId?: { name: string; key: string }
    ticketId?: { key: string; summary: string }
    startTime: string
    endTime: string
    durationMinutes: number
    description?: string
    userId?: { firstName: string; lastName: string }
  }>,
  options: ExportOptions,
  descriptionOverrides: Record<string, string> = {},
): Promise<Buffer | undefined> {
  if (!entries.length) return undefined

  const headers = columnHeaders[options.locale] || columnHeaders.en

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Timesheet')

  // Column widths: Date(A), Start(B), End(C), Hours(D), Project(E), Ticket(F), Summary(G), Description(H)
  worksheet.columns = [
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 15 },
    { width: 15 },
    { width: 30 },
    { width: 30 },
  ]

  // Title row
  const titleRow = worksheet.addRow([
    `Timesheet: ${options.userName}`,
  ])
  titleRow.font = { bold: true, size: 14 }

  // Period row
  worksheet.addRow([
    `${options.startDate.toISOString().split('T')[0]} - ${options.endDate.toISOString().split('T')[0]}`,
  ])

  // Blank row
  worksheet.addRow([])

  // Header row: Date, Start, End, Hours, Project, Ticket, Summary, Description
  const headerRow = worksheet.addRow([
    headers.date,
    headers.start,
    headers.end,
    headers.hours,
    headers.project,
    headers.ticket,
    headers.summary,
    headers.description,
  ])
  headerRow.font = { bold: true }

  // Data rows
  const firstDataRow = headerRow.number + 1
  for (const entry of entries) {
    const date =
      entry.date instanceof Date
        ? entry.date.toISOString().split('T')[0]
        : new Date(entry.date).toISOString().split('T')[0]

    // Convert time strings to Excel time fractions
    const [sh, sm] = entry.startTime.split(':').map(Number)
    const [eh, em] = entry.endTime.split(':').map(Number)
    const startFraction = (sh * 60 + sm) / (24 * 60)
    const endFraction = (eh * 60 + em) / (24 * 60)

    const description = entry._id
      ? (descriptionOverrides[String(entry._id)] ?? entry.description ?? '')
      : (entry.description ?? '')

    const row = worksheet.addRow([
      date,
      startFraction,
      endFraction,
      null, // placeholder for formula
      entry.projectId?.key || '',
      entry.ticketId?.key || '',
      entry.ticketId?.summary || '',
      description,
    ])

    // Format Start/End as HH:mm
    row.getCell(2).numFmt = 'HH:mm'
    row.getCell(3).numFmt = 'HH:mm'

    // Hours formula: =(C{row}-B{row})*24
    row.getCell(4).value = { formula: `(C${row.number}-B${row.number})*24` } as any
    row.getCell(4).numFmt = '0.00'
  }

  const lastDataRow = worksheet.lastRow!.number

  // Blank row
  worksheet.addRow([])

  // Totals row
  const totalsRow = worksheet.addRow([
    '',
    '',
    headers.hours + ':',
    null, // placeholder for SUM formula
    '',
    '',
    '',
    '',
  ])
  totalsRow.font = { bold: true }
  totalsRow.getCell(4).value = { formula: `SUM(D${firstDataRow}:D${lastDataRow})` } as any
  totalsRow.getCell(4).numFmt = '0.00'

  // Write to buffer directly (no temp file needed)
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
