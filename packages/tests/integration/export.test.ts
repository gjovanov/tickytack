import { describe, it, expect } from 'bun:test'
import ExcelJS from 'exceljs'
import { generateTimesheetXLSX } from 'reporting/excel/timesheet.excel'

const sampleEntries = [
  {
    _id: 'entry1',
    date: new Date('2026-02-02'),
    projectId: { name: 'Project Class', key: 'PCLASS' },
    ticketId: { key: 'PCLASS-101', summary: 'Implement login' },
    startTime: '09:00',
    endTime: '12:00',
    durationMinutes: 180,
    description: 'Worked on login feature',
  },
  {
    _id: 'entry2',
    date: new Date('2026-02-02'),
    projectId: { name: 'Project Class', key: 'PCLASS' },
    ticketId: { key: 'PCLASS-102', summary: 'Fix tests' },
    startTime: '13:00',
    endTime: '15:00',
    durationMinutes: 120,
    description: 'Fixed failing tests',
  },
  {
    _id: 'entry3',
    date: new Date('2026-02-03'),
    projectId: { name: 'Internal', key: 'INT' },
    ticketId: { key: 'INT-200', summary: 'Code review' },
    startTime: '10:00',
    endTime: '11:30',
    durationMinutes: 90,
    description: '',
  },
]

const defaultOptions = {
  startDate: new Date('2026-02-01'),
  endDate: new Date('2026-02-08'),
  locale: 'en',
  userName: 'Test User',
}

describe('Excel Export', () => {
  it('should generate a valid XLSX buffer', async () => {
    const buffer = await generateTimesheetXLSX(sampleEntries, defaultOptions)

    expect(buffer).toBeDefined()
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer!.length).toBeGreaterThan(0)

    // XLSX files start with PK (ZIP header)
    expect(buffer![0]).toBe(0x50) // 'P'
    expect(buffer![1]).toBe(0x4b) // 'K'
  })

  it('should return undefined for empty entries', async () => {
    const buffer = await generateTimesheetXLSX([], defaultOptions)
    expect(buffer).toBeUndefined()
  })

  it('should handle German locale', async () => {
    const entries = [
      {
        _id: 'de1',
        date: new Date('2026-02-02'),
        projectId: { name: 'Projekt', key: 'PRJ' },
        ticketId: { key: 'PRJ-100', summary: 'Aufgabe' },
        startTime: '08:00',
        endTime: '16:00',
        durationMinutes: 480,
        description: 'Ganzer Tag',
      },
    ]

    const buffer = await generateTimesheetXLSX(entries, {
      ...defaultOptions,
      locale: 'de',
      userName: 'Max Mustermann',
    })

    expect(buffer).toBeDefined()
    expect(buffer!.length).toBeGreaterThan(0)
  })

  it('should handle entries with string dates', async () => {
    const entries = [
      {
        date: '2026-02-02T00:00:00.000Z',
        projectId: { name: 'P', key: 'P' },
        ticketId: { key: 'P-100', summary: 'Task' },
        startTime: '09:00',
        endTime: '10:00',
        durationMinutes: 60,
      },
    ]

    const buffer = await generateTimesheetXLSX(entries, defaultOptions)

    expect(buffer).toBeDefined()
    expect(buffer!.length).toBeGreaterThan(0)
  })

  it('should handle entries with missing optional fields', async () => {
    const entries = [
      {
        date: new Date('2026-02-02'),
        startTime: '09:00',
        endTime: '10:00',
        durationMinutes: 60,
      },
    ]

    const buffer = await generateTimesheetXLSX(entries, defaultOptions)

    expect(buffer).toBeDefined()
    expect(buffer!.length).toBeGreaterThan(0)
  })

  it('should use formulas for Hours and Total', async () => {
    const buffer = await generateTimesheetXLSX(sampleEntries, defaultOptions)
    expect(buffer).toBeDefined()

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer!)

    const worksheet = workbook.getWorksheet('Timesheet')!

    // Header is row 4 (title=1, period=2, blank=3, header=4)
    // First data row is 5
    const firstDataRow = 5
    const lastDataRow = firstDataRow + sampleEntries.length - 1

    // Verify Hours formula in data rows (column D = 4)
    for (let r = firstDataRow; r <= lastDataRow; r++) {
      const cell = worksheet.getRow(r).getCell(4)
      const val = cell.value as any
      expect(val).toBeDefined()
      expect(val.formula).toBeDefined()
      expect(val.formula).toContain(`C${r}`)
      expect(val.formula).toContain(`B${r}`)
    }

    // Verify Total row SUM formula
    // After data rows there's a blank row, then totals row
    const totalsRowNum = lastDataRow + 2
    const totalCell = worksheet.getRow(totalsRowNum).getCell(4)
    const totalVal = totalCell.value as any
    expect(totalVal).toBeDefined()
    expect(totalVal.formula).toBeDefined()
    expect(totalVal.formula).toBe(`SUM(D${firstDataRow}:D${lastDataRow})`)
  })

  it('should apply description overrides', async () => {
    const overrides = {
      entry1: 'Override description for entry 1',
      entry3: 'Custom review notes',
    }

    const buffer = await generateTimesheetXLSX(sampleEntries, defaultOptions, overrides)
    expect(buffer).toBeDefined()

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer!)

    const worksheet = workbook.getWorksheet('Timesheet')!

    // Description is column H = 8
    // Row 5 = entry1 -> should have override
    expect(worksheet.getRow(5).getCell(8).value).toBe('Override description for entry 1')
    // Row 6 = entry2 -> no override, should keep original
    expect(worksheet.getRow(6).getCell(8).value).toBe('Fixed failing tests')
    // Row 7 = entry3 -> should have override
    expect(worksheet.getRow(7).getCell(8).value).toBe('Custom review notes')
  })

  it('should write Start/End as time-formatted values', async () => {
    const buffer = await generateTimesheetXLSX(sampleEntries, defaultOptions)
    expect(buffer).toBeDefined()

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer!)

    const worksheet = workbook.getWorksheet('Timesheet')!

    // ExcelJS reads time fractions back as Date objects (Excel epoch 1899-12-30)
    // Verify the format is HH:mm and the value is a Date representing the correct time
    const startCell = worksheet.getRow(5).getCell(2)
    expect(startCell.numFmt).toBe('HH:mm')
    const startDate = startCell.value as Date
    expect(startDate).toBeInstanceOf(Date)
    expect(startDate.getUTCHours()).toBe(9)
    expect(startDate.getUTCMinutes()).toBe(0)

    const endCell = worksheet.getRow(5).getCell(3)
    expect(endCell.numFmt).toBe('HH:mm')
    const endDate = endCell.value as Date
    expect(endDate).toBeInstanceOf(Date)
    expect(endDate.getUTCHours()).toBe(12)
    expect(endDate.getUTCMinutes()).toBe(0)
  })

  it('should use new column order: Date, Start, End, Hours, Project, Ticket, Summary, Description', async () => {
    const buffer = await generateTimesheetXLSX(sampleEntries, defaultOptions)
    expect(buffer).toBeDefined()

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer!)

    const worksheet = workbook.getWorksheet('Timesheet')!
    const headerRow = worksheet.getRow(4)

    expect(headerRow.getCell(1).value).toBe('Date')
    expect(headerRow.getCell(2).value).toBe('Start')
    expect(headerRow.getCell(3).value).toBe('End')
    expect(headerRow.getCell(4).value).toBe('Hours')
    expect(headerRow.getCell(5).value).toBe('Project')
    expect(headerRow.getCell(6).value).toBe('Ticket')
    expect(headerRow.getCell(7).value).toBe('Summary')
    expect(headerRow.getCell(8).value).toBe('Description')
  })
})
