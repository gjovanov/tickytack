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
    title: 'Timesheet Report',
    period: 'Period',
    user: 'User',
    total: 'Total Hours',
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
    title: 'Zeiterfassungsbericht',
    period: 'Zeitraum',
    user: 'Benutzer',
    total: 'Gesamtstunden',
  },
}

export async function generateTimesheetPDF(
  entries: Array<{
    _id?: string
    date: Date | string
    projectId?: { name: string; key: string }
    ticketId?: { key: string; summary: string }
    startTime: string
    endTime: string
    durationMinutes: number
    description?: string
  }>,
  options: ExportOptions,
  descriptionOverrides: Record<string, string> = {},
): Promise<Buffer | undefined> {
  if (!entries.length) return undefined

  const h = columnHeaders[options.locale] || columnHeaders.en
  const startStr = options.startDate.toISOString().split('T')[0]
  const endStr = options.endDate.toISOString().split('T')[0]

  let totalMinutes = 0

  // Build markdown
  let md = `# ${h.title}\n\n`
  md += `**${h.user}:** ${options.userName}\n\n`
  md += `**${h.period}:** ${startStr} - ${endStr}\n\n`
  md += `| ${h.date} | ${h.project} | ${h.ticket} | ${h.summary} | ${h.start} | ${h.end} | ${h.hours} | ${h.description} |\n`
  md += `|----------|---------|--------|---------|-------|-----|-------|-------------|\n`

  for (const entry of entries) {
    const date =
      entry.date instanceof Date
        ? entry.date.toISOString().split('T')[0]
        : new Date(entry.date).toISOString().split('T')[0]
    const hours = (entry.durationMinutes / 60).toFixed(2)
    totalMinutes += entry.durationMinutes

    const description = entry._id
      ? (descriptionOverrides[String(entry._id)] ?? entry.description ?? '')
      : (entry.description ?? '')
    md += `| ${date} | ${entry.projectId?.key || ''} | ${entry.ticketId?.key || ''} | ${entry.ticketId?.summary || ''} | ${entry.startTime} | ${entry.endTime} | ${hours} | ${description} |\n`
  }

  md += `\n**${h.total}:** ${(totalMinutes / 60).toFixed(2)}\n`

  const { mdToPdf } = await import('md-to-pdf')
  const result = await mdToPdf(
    { content: md },
    {
      launch_options: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
      pdf_options: { format: 'A4', landscape: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } },
    },
  )

  return result?.content
}
