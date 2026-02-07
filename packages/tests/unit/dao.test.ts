import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { mongoose } from 'db/src/connection'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Org, User, Project, Ticket, TimeEntry } from 'db/src/models'
import { orgDao } from 'services/src/dao/org.dao'
import { userDao } from 'services/src/dao/user.dao'
import { projectDao } from 'services/src/dao/project.dao'
import { ticketDao } from 'services/src/dao/ticket.dao'
import { timeEntryDao } from 'services/src/dao/time-entry.dao'

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await Promise.all([
    Org.deleteMany({}),
    User.deleteMany({}),
    Project.deleteMany({}),
    Ticket.deleteMany({}),
    TimeEntry.deleteMany({}),
  ])
})

describe('OrgDao', () => {
  it('should create and find an org', async () => {
    const org = await orgDao.create({
      name: 'Test Org',
      slug: 'test-org',
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
    })
    expect(org.name).toBe('Test Org')
    expect(org.slug).toBe('test-org')

    const found = await orgDao.findBySlug('test-org')
    expect(found).not.toBeNull()
    expect(found!.name).toBe('Test Org')
  })

  it('should update an org', async () => {
    const org = await orgDao.create({ name: 'Old', slug: 'old' })
    const updated = await orgDao.update(org._id, { name: 'New' })
    expect(updated!.name).toBe('New')
  })

  it('should delete an org', async () => {
    const org = await orgDao.create({ name: 'Del', slug: 'del' })
    await orgDao.delete(org._id)
    const found = await orgDao.findById(org._id)
    expect(found).toBeNull()
  })
})

describe('UserDao', () => {
  it('should create a user and find by email+org', async () => {
    const org = await orgDao.create({ name: 'Org', slug: 'org' })
    const user = await userDao.create({
      email: 'test@test.com',
      username: 'testuser',
      password: 'hashed',
      firstName: 'Test',
      lastName: 'User',
      role: 'member',
      orgId: org._id,
    })
    expect(user.email).toBe('test@test.com')

    const found = await userDao.findByEmailAndOrg('test@test.com', String(org._id))
    expect(found).not.toBeNull()
    expect(found!.username).toBe('testuser')
  })

  it('should find by username and org slug', async () => {
    const org = await orgDao.create({ name: 'Org', slug: 'myorg' })
    await userDao.create({
      email: 'a@b.com',
      username: 'admin',
      password: 'hashed',
      firstName: 'A',
      lastName: 'B',
      role: 'admin',
      orgId: org._id,
    })

    const found = await userDao.findByUsernameAndOrgSlug('admin', 'myorg')
    expect(found).not.toBeNull()
    expect(found!.firstName).toBe('A')
  })
})

describe('ProjectDao', () => {
  it('should create and list projects by org', async () => {
    const org = await orgDao.create({ name: 'Org', slug: 'org' })
    await projectDao.create({ name: 'P1', key: 'P1', orgId: org._id })
    await projectDao.create({ name: 'P2', key: 'P2', orgId: org._id })

    const projects = await projectDao.findByOrgId(String(org._id))
    expect(projects.length).toBe(2)
  })
})

describe('TicketDao', () => {
  it('should auto-increment sequence number', async () => {
    const org = await orgDao.create({ name: 'Org', slug: 'org' })
    const project = await projectDao.create({ name: 'P1', key: 'TST', orgId: org._id })

    const seq1 = await ticketDao.getNextSequenceNumber(String(project._id))
    expect(seq1).toBe(100) // first ticket starts at 100

    await ticketDao.create({
      key: 'TST-100',
      summary: 'First ticket',
      projectId: project._id,
      orgId: org._id,
      reporterId: org._id, // placeholder
      sequenceNumber: 100,
    })

    const seq2 = await ticketDao.getNextSequenceNumber(String(project._id))
    expect(seq2).toBe(101)
  })
})

describe('TimeEntryDao', () => {
  it('should find entries by user and date range', async () => {
    const org = await orgDao.create({ name: 'Org', slug: 'org' })
    const user = await userDao.create({
      email: 'u@u.com',
      username: 'u',
      password: 'h',
      firstName: 'U',
      lastName: 'U',
      role: 'member',
      orgId: org._id,
    })
    const project = await projectDao.create({ name: 'P', key: 'P', orgId: org._id })
    const ticket = await ticketDao.create({
      key: 'P-100',
      summary: 'T',
      projectId: project._id,
      orgId: org._id,
      reporterId: user._id,
      sequenceNumber: 100,
    })

    await timeEntryDao.create({
      orgId: org._id,
      userId: user._id,
      ticketId: ticket._id,
      projectId: project._id,
      date: new Date('2025-01-06'),
      startTime: '08:00',
      endTime: '12:00',
      durationMinutes: 240,
    })

    const entries = await timeEntryDao.findByUserAndDateRange(
      String(org._id),
      String(user._id),
      new Date('2025-01-06'),
      new Date('2025-01-10'),
    )
    expect(entries.length).toBe(1)
    expect(entries[0].durationMinutes).toBe(240)
  })

  it('should enforce multi-tenancy isolation', async () => {
    const org1 = await orgDao.create({ name: 'Org1', slug: 'org1' })
    const org2 = await orgDao.create({ name: 'Org2', slug: 'org2' })

    const user1 = await userDao.create({
      email: 'u1@u.com', username: 'u1', password: 'h', firstName: 'U1', lastName: 'U1', role: 'member', orgId: org1._id,
    })
    const user2 = await userDao.create({
      email: 'u2@u.com', username: 'u2', password: 'h', firstName: 'U2', lastName: 'U2', role: 'member', orgId: org2._id,
    })

    const p1 = await projectDao.create({ name: 'P1', key: 'P1', orgId: org1._id })
    const p2 = await projectDao.create({ name: 'P2', key: 'P2', orgId: org2._id })

    const t1 = await ticketDao.create({ key: 'P1-100', summary: 'T1', projectId: p1._id, orgId: org1._id, reporterId: user1._id, sequenceNumber: 100 })
    const t2 = await ticketDao.create({ key: 'P2-100', summary: 'T2', projectId: p2._id, orgId: org2._id, reporterId: user2._id, sequenceNumber: 100 })

    await timeEntryDao.create({ orgId: org1._id, userId: user1._id, ticketId: t1._id, projectId: p1._id, date: new Date('2025-01-06'), startTime: '08:00', endTime: '12:00', durationMinutes: 240 })
    await timeEntryDao.create({ orgId: org2._id, userId: user2._id, ticketId: t2._id, projectId: p2._id, date: new Date('2025-01-06'), startTime: '08:00', endTime: '12:00', durationMinutes: 240 })

    // User1 should only see org1 entries
    const entries1 = await timeEntryDao.findByUserAndDateRange(String(org1._id), String(user1._id), new Date('2025-01-06'), new Date('2025-01-10'))
    expect(entries1.length).toBe(1)

    // User2 should only see org2 entries
    const entries2 = await timeEntryDao.findByUserAndDateRange(String(org2._id), String(user2._id), new Date('2025-01-06'), new Date('2025-01-10'))
    expect(entries2.length).toBe(1)

    // Cross-org query returns nothing
    const crossEntries = await timeEntryDao.findByUserAndDateRange(String(org1._id), String(user2._id), new Date('2025-01-06'), new Date('2025-01-10'))
    expect(crossEntries.length).toBe(0)
  })
})
