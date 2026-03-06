import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mongoose } from 'db/src/connection'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Org, User, Project, Ticket, TimeEntry } from 'db/src/models'
import { generateTimesheetXLSX } from 'reporting/excel/timesheet.excel'
import { parseTimesheetXLSX } from 'reporting/excel/timesheet-import.excel'
import { importTimeEntries } from 'services/src/biz/timeentry-import.service'
import { encrypt, decrypt } from 'services/src/biz/crypto.service'

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

// ─── Crypto Service ───

describe('Crypto Service', () => {
  const key = 'test_encryption_key_32_chars_ok!'

  it('should encrypt and decrypt round-trip', () => {
    const plaintext = 'my_secret_jira_token_abc123'
    const encrypted = encrypt(plaintext, key)
    expect(encrypted).not.toBe(plaintext)
    expect(encrypted.split(':')).toHaveLength(3) // iv:authTag:data
    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe(plaintext)
  })

  it('should produce different ciphertexts for same input (random IV)', () => {
    const plaintext = 'same_token'
    const a = encrypt(plaintext, key)
    const b = encrypt(plaintext, key)
    expect(a).not.toBe(b)
    expect(decrypt(a, key)).toBe(plaintext)
    expect(decrypt(b, key)).toBe(plaintext)
  })

  it('should fail to decrypt with wrong key', () => {
    const encrypted = encrypt('secret', key)
    expect(() => decrypt(encrypted, 'wrong_key_that_is_32_chars_long!')).toThrow()
  })
})

// ─── Excel Import Parser ───

describe('Excel Import Parser', () => {
  const sampleEntries = [
    {
      _id: 'e1',
      date: new Date('2026-02-02'),
      projectId: { name: 'PCON Classic', key: 'PCLASS' },
      ticketId: { key: 'PCLASS-101', summary: 'Fix report generation' },
      startTime: '09:00',
      endTime: '12:00',
      durationMinutes: 180,
      description: 'Worked on reports',
    },
    {
      _id: 'e2',
      date: new Date('2026-02-02'),
      projectId: { name: 'PCON Classic', key: 'PCLASS' },
      ticketId: { key: 'PCLASS-102', summary: 'Update schema' },
      startTime: '13:00',
      endTime: '15:30',
      durationMinutes: 150,
      description: 'Schema updates',
    },
    {
      _id: 'e3',
      date: new Date('2026-02-03'),
      projectId: { name: 'PCON Plus', key: 'PPLUS' },
      ticketId: { key: 'PPLUS-100', summary: 'Auth module' },
      startTime: '08:30',
      endTime: '11:45',
      durationMinutes: 195,
      description: '',
    },
  ]

  const exportOptions = {
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-08'),
    locale: 'en',
    userName: 'Test User',
  }

  it('should round-trip: export → import produces matching data', async () => {
    const buffer = await generateTimesheetXLSX(sampleEntries, exportOptions)
    expect(buffer).toBeDefined()

    const parsed = await parseTimesheetXLSX(buffer!)

    expect(parsed.userName).toBe('Test User')
    expect(parsed.startDate).toBe('2026-02-01')
    expect(parsed.endDate).toBe('2026-02-08')
    expect(parsed.entries).toHaveLength(3)

    // Verify first entry
    expect(parsed.entries[0].date).toBe('2026-02-02')
    expect(parsed.entries[0].startTime).toBe('09:00')
    expect(parsed.entries[0].endTime).toBe('12:00')
    expect(parsed.entries[0].projectKey).toBe('PCLASS')
    expect(parsed.entries[0].ticketKey).toBe('PCLASS-101')
    expect(parsed.entries[0].summary).toBe('Fix report generation')
    expect(parsed.entries[0].description).toBe('Worked on reports')

    // Verify time with half-hours
    expect(parsed.entries[1].startTime).toBe('13:00')
    expect(parsed.entries[1].endTime).toBe('15:30')

    // Verify 08:30 and 11:45
    expect(parsed.entries[2].startTime).toBe('08:30')
    expect(parsed.entries[2].endTime).toBe('11:45')
  })

  it('should round-trip with German locale', async () => {
    const buffer = await generateTimesheetXLSX(sampleEntries, {
      ...exportOptions,
      locale: 'de',
      userName: 'Max Mustermann',
    })
    expect(buffer).toBeDefined()

    const parsed = await parseTimesheetXLSX(buffer!)
    expect(parsed.userName).toBe('Max Mustermann')
    expect(parsed.entries).toHaveLength(3)
    expect(parsed.entries[0].ticketKey).toBe('PCLASS-101')
  })

  it('should reject invalid file format', async () => {
    const invalidBuffer = Buffer.from('not an excel file')
    await expect(parseTimesheetXLSX(invalidBuffer)).rejects.toThrow()
  })
})

// ─── Time Entry Import Service ───

describe('Time Entry Import Service', () => {
  let orgId: string
  let userId: string

  beforeAll(async () => {
    // Create test data
    const org = await Org.create({
      name: 'Import Test Org',
      slug: `import-test-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
    })
    orgId = String(org._id)

    const user = await User.create({
      email: `import-test-${Date.now()}@test.com`,
      username: `importuser-${Date.now()}`,
      password: await Bun.password.hash('test123'),
      firstName: 'Import',
      lastName: 'User',
      role: 'admin',
      orgId: org._id,
      isActive: true,
    })
    userId = String(user._id)

    const project = await Project.create({
      name: 'Import Project',
      key: 'IMP',
      orgId: org._id,
    })

    await Ticket.create({
      key: 'IMP-100',
      summary: 'Test ticket A',
      projectId: project._id,
      orgId: org._id,
      reporterId: user._id,
      sequenceNumber: 100,
    })

    await Ticket.create({
      key: 'IMP-101',
      summary: 'Test ticket B',
      projectId: project._id,
      orgId: org._id,
      reporterId: user._id,
      sequenceNumber: 101,
    })
  })

  it('should import time entries from parsed Excel data', async () => {
    const result = await importTimeEntries({
      orgId,
      userId,
      entries: [
        {
          row: 5,
          date: '2026-03-02',
          startTime: '09:00',
          endTime: '12:00',
          hours: 3,
          projectKey: 'IMP',
          ticketKey: 'IMP-100',
          summary: 'Test ticket A',
          description: 'Did some work',
        },
        {
          row: 6,
          date: '2026-03-02',
          startTime: '13:00',
          endTime: '15:00',
          hours: 2,
          projectKey: 'IMP',
          ticketKey: 'IMP-101',
          summary: 'Test ticket B',
          description: '',
        },
      ],
      replaceExisting: false,
      startDate: '2026-03-01',
      endDate: '2026-03-08',
    })

    expect(result.imported).toBe(2)
    expect(result.errors).toHaveLength(0)
    expect(result.replaced).toBe(0)

    // Verify entries in DB
    const entries = await TimeEntry.find({ orgId, userId })
    expect(entries.length).toBeGreaterThanOrEqual(2)
  })

  it('should append entries when replaceExisting is false', async () => {
    const countBefore = await TimeEntry.countDocuments({
      orgId,
      userId,
      date: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-08') },
    })

    const result = await importTimeEntries({
      orgId,
      userId,
      entries: [
        {
          row: 5,
          date: '2026-03-03',
          startTime: '10:00',
          endTime: '11:00',
          hours: 1,
          projectKey: 'IMP',
          ticketKey: 'IMP-100',
          summary: 'Test ticket A',
          description: 'Extra entry',
        },
      ],
      replaceExisting: false,
      startDate: '2026-03-01',
      endDate: '2026-03-08',
    })

    expect(result.imported).toBe(1)
    expect(result.replaced).toBe(0)

    const countAfter = await TimeEntry.countDocuments({
      orgId,
      userId,
      date: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-08') },
    })
    expect(countAfter).toBe(countBefore + 1)
  })

  it('should replace entries when replaceExisting is true', async () => {
    const countBefore = await TimeEntry.countDocuments({
      orgId,
      userId,
      date: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-08') },
    })
    expect(countBefore).toBeGreaterThan(0)

    const result = await importTimeEntries({
      orgId,
      userId,
      entries: [
        {
          row: 5,
          date: '2026-03-04',
          startTime: '09:00',
          endTime: '10:00',
          hours: 1,
          projectKey: 'IMP',
          ticketKey: 'IMP-100',
          summary: 'Test ticket A',
          description: 'Replacement entry',
        },
      ],
      replaceExisting: true,
      startDate: '2026-03-01',
      endDate: '2026-03-08',
    })

    expect(result.imported).toBe(1)
    expect(result.replaced).toBe(countBefore)

    // Only the new entry should exist for this period
    const countAfter = await TimeEntry.countDocuments({
      orgId,
      userId,
      date: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-08') },
    })
    expect(countAfter).toBe(1)
  })

  it('should fail with errors for unknown ticket keys', async () => {
    const result = await importTimeEntries({
      orgId,
      userId,
      entries: [
        {
          row: 5,
          date: '2026-04-01',
          startTime: '09:00',
          endTime: '10:00',
          hours: 1,
          projectKey: 'UNKNOWN',
          ticketKey: 'UNKNOWN-999',
          summary: 'Does not exist',
          description: '',
        },
      ],
      replaceExisting: false,
      startDate: '2026-04-01',
      endDate: '2026-04-08',
    })

    expect(result.imported).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].message).toContain('UNKNOWN-999')
  })

  it('should fail for entries with missing ticket key', async () => {
    const result = await importTimeEntries({
      orgId,
      userId,
      entries: [
        {
          row: 5,
          date: '2026-04-01',
          startTime: '09:00',
          endTime: '10:00',
          hours: 1,
          projectKey: 'IMP',
          ticketKey: '',
          summary: '',
          description: '',
        },
      ],
      replaceExisting: false,
      startDate: '2026-04-01',
      endDate: '2026-04-08',
    })

    expect(result.imported).toBe(0)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].message).toContain('Missing ticket key')
  })

  it('should perform full round-trip: export → parse → import', async () => {
    // Create fresh entries
    const org = await Org.create({
      name: 'Round Trip Org',
      slug: `roundtrip-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
    })
    const user = await User.create({
      email: `roundtrip-${Date.now()}@test.com`,
      username: `roundtrip-${Date.now()}`,
      password: await Bun.password.hash('test'),
      firstName: 'Round',
      lastName: 'Trip',
      role: 'admin',
      orgId: org._id,
      isActive: true,
    })
    const project = await Project.create({
      name: 'RT Project',
      key: 'RT',
      orgId: org._id,
    })
    const ticket = await Ticket.create({
      key: 'RT-100',
      summary: 'Round trip ticket',
      projectId: project._id,
      orgId: org._id,
      reporterId: user._id,
      sequenceNumber: 100,
    })

    // Create a time entry
    await TimeEntry.create({
      orgId: org._id,
      userId: user._id,
      ticketId: ticket._id,
      projectId: project._id,
      date: new Date('2026-05-04'),
      startTime: '09:15',
      endTime: '11:45',
      durationMinutes: 150,
      description: 'Round trip test',
    })

    // Export
    const entries = await TimeEntry.find({ orgId: org._id, userId: user._id })
      .populate('ticketId', 'key summary')
      .populate('projectId', 'name key color')
    const buffer = await generateTimesheetXLSX(entries as any, {
      startDate: new Date('2026-05-04'),
      endDate: new Date('2026-05-10'),
      locale: 'en',
      userName: 'Round Trip',
    })
    expect(buffer).toBeDefined()

    // Parse
    const parsed = await parseTimesheetXLSX(buffer!)
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0].ticketKey).toBe('RT-100')
    expect(parsed.entries[0].startTime).toBe('09:15')
    expect(parsed.entries[0].endTime).toBe('11:45')

    // Delete original entries, then import
    await TimeEntry.deleteMany({ orgId: org._id })

    // Import
    const result = await importTimeEntries({
      orgId: String(org._id),
      userId: String(user._id),
      entries: parsed.entries,
      replaceExisting: false,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    })

    expect(result.imported).toBe(1)
    expect(result.errors).toHaveLength(0)

    // Verify the imported entry
    const imported = await TimeEntry.findOne({ orgId: org._id, userId: user._id })
    expect(imported).toBeDefined()
    expect(imported!.startTime).toBe('09:15')
    expect(imported!.endTime).toBe('11:45')
    expect(imported!.durationMinutes).toBe(150)
    expect(imported!.description).toBe('Round trip test')
  })
})
