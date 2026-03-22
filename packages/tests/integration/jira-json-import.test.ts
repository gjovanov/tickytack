import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { mongoose } from 'db/src/connection'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Org, User, Project, Ticket } from 'db/src/models'
import { importProjectsFromJson, importIssuesFromJson } from 'services/src/biz/jira-import.service'
import type { JiraProject, JiraSearchResult } from 'services/src/biz/jira.types'

let mongoServer: MongoMemoryServer
let orgId: string
let userId: string

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

beforeEach(async () => {
  await Promise.all([Org.deleteMany({}), User.deleteMany({}), Project.deleteMany({}), Ticket.deleteMany({})])
  const org = await Org.create({ name: 'Test Org', slug: 'test-org', settings: { weekStartsOn: 1, workingHoursPerDay: 8 } })
  orgId = String(org._id)
  const user = await User.create({
    email: 'admin@test.io', username: 'admin', password: 'hashed',
    firstName: 'Admin', lastName: 'User', role: 'admin', orgId: org._id, isActive: true,
  })
  userId = String(user._id)
})

// ─── importProjectsFromJson ───

describe('importProjectsFromJson', () => {
  const sampleProjects: JiraProject[] = [
    { id: '10001', key: 'WEB', name: 'Web Platform', description: 'Main web app' },
    { id: '10002', key: 'MOB', name: 'Mobile App' },
  ]

  it('creates new projects from JSON array', async () => {
    const result = await importProjectsFromJson(orgId, userId, sampleProjects)
    expect(result.created).toBe(2)
    expect(result.updated).toBe(0)
    expect(result.errors).toHaveLength(0)

    const projects = await Project.find({ orgId })
    expect(projects).toHaveLength(2)
    expect(projects.find(p => p.key === 'WEB')?.source).toBe('jira')
    expect(projects.find(p => p.key === 'MOB')?.sourceId).toBe('10002')
  })

  it('updates existing projects on re-import', async () => {
    await importProjectsFromJson(orgId, userId, sampleProjects)
    const updated = [{ ...sampleProjects[0], name: 'Web Platform v2' }]
    const result = await importProjectsFromJson(orgId, userId, updated)
    expect(result.updated).toBe(1)
    expect(result.created).toBe(0)

    const proj = await Project.findOne({ key: 'WEB', orgId })
    expect(proj?.name).toBe('Web Platform v2')
  })

  it('handles empty array', async () => {
    const result = await importProjectsFromJson(orgId, userId, [])
    expect(result.created).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('reports error for projects missing key/name', async () => {
    const bad = [{ id: '1', key: '', name: '' } as JiraProject]
    const result = await importProjectsFromJson(orgId, userId, bad)
    expect(result.errors).toHaveLength(1)
    expect(result.created).toBe(0)
  })

  it('handles mixed valid and invalid projects', async () => {
    const mixed = [
      { id: '1', key: 'GOOD', name: 'Good Project' },
      { id: '2', key: '', name: '' },
    ] as JiraProject[]
    const result = await importProjectsFromJson(orgId, userId, mixed)
    expect(result.created).toBe(1)
    expect(result.errors).toHaveLength(1)
  })

  it('preserves description field', async () => {
    await importProjectsFromJson(orgId, userId, sampleProjects)
    const proj = await Project.findOne({ key: 'WEB', orgId })
    expect(proj?.description).toBe('Main web app')
    const proj2 = await Project.findOne({ key: 'MOB', orgId })
    expect(proj2?.description).toBeNull()
  })
})

// ─── importIssuesFromJson ───

describe('importIssuesFromJson', () => {
  const sampleSearchResult: JiraSearchResult = {
    issues: [
      {
        id: '10100', key: 'WEB-101',
        fields: {
          summary: 'Fix login bug',
          description: 'Users cannot login with SSO',
          status: { name: 'In Progress' },
          priority: { name: 'High' },
          assignee: { emailAddress: 'admin@test.io', displayName: 'Admin' },
          reporter: { emailAddress: 'admin@test.io', displayName: 'Admin' },
        },
      },
      {
        id: '10101', key: 'WEB-102',
        fields: {
          summary: 'Add dark mode',
          status: { name: 'To Do' },
          priority: { name: 'Low' },
        },
      },
      {
        id: '10102', key: 'WEB-103',
        fields: {
          summary: 'Resolved ticket',
          status: { name: 'Done' },
          priority: { name: 'Critical' },
        },
      },
    ],
    total: 3,
    startAt: 0,
    maxResults: 50,
  }

  beforeEach(async () => {
    // Create the WEB project first
    await Project.create({
      name: 'Web Platform', key: 'WEB', orgId, isActive: true,
      source: 'jira', sourceId: '10001',
    })
  })

  it('creates tickets from JIRA search result JSON', async () => {
    const result = await importIssuesFromJson(orgId, userId, sampleSearchResult)
    expect(result.created).toBe(3)
    expect(result.updated).toBe(0)
    expect(result.errors).toHaveLength(0)

    const tickets = await Ticket.find({ orgId })
    expect(tickets).toHaveLength(3)
  })

  it('maps JIRA statuses correctly', async () => {
    await importIssuesFromJson(orgId, userId, sampleSearchResult)
    const t1 = await Ticket.findOne({ key: 'WEB-101', orgId })
    expect(t1?.status).toBe('in_progress')
    const t2 = await Ticket.findOne({ key: 'WEB-102', orgId })
    expect(t2?.status).toBe('open') // "To Do" → open
    const t3 = await Ticket.findOne({ key: 'WEB-103', orgId })
    expect(t3?.status).toBe('done')
  })

  it('maps JIRA priorities correctly', async () => {
    await importIssuesFromJson(orgId, userId, sampleSearchResult)
    const t1 = await Ticket.findOne({ key: 'WEB-101', orgId })
    expect(t1?.priority).toBe('high')
    const t2 = await Ticket.findOne({ key: 'WEB-102', orgId })
    expect(t2?.priority).toBe('low')
    const t3 = await Ticket.findOne({ key: 'WEB-103', orgId })
    expect(t3?.priority).toBe('highest') // Critical → highest
  })

  it('matches assignee by email', async () => {
    await importIssuesFromJson(orgId, userId, sampleSearchResult)
    const t1 = await Ticket.findOne({ key: 'WEB-101', orgId })
    expect(String(t1?.assigneeId)).toBe(userId)
  })

  it('sets null assignee for unknown email', async () => {
    await importIssuesFromJson(orgId, userId, sampleSearchResult)
    const t2 = await Ticket.findOne({ key: 'WEB-102', orgId })
    expect(t2?.assigneeId).toBeNull()
  })

  it('updates existing tickets on re-import', async () => {
    await importIssuesFromJson(orgId, userId, sampleSearchResult)
    const updated: JiraSearchResult = {
      ...sampleSearchResult,
      issues: [{
        id: '10100', key: 'WEB-101',
        fields: { summary: 'Fix login bug (updated)', status: { name: 'Done' }, priority: { name: 'Medium' } },
      }],
    }
    const result = await importIssuesFromJson(orgId, userId, updated)
    expect(result.updated).toBe(1)
    expect(result.created).toBe(0)

    const ticket = await Ticket.findOne({ key: 'WEB-101', orgId })
    expect(ticket?.summary).toBe('Fix login bug (updated)')
    expect(ticket?.status).toBe('done')
  })

  it('fails if project does not exist', async () => {
    const noProject: JiraSearchResult = {
      issues: [{ id: '1', key: 'NOPE-1', fields: { summary: 'test', status: { name: 'Open' } } }],
      total: 1, startAt: 0, maxResults: 50,
    }
    const result = await importIssuesFromJson(orgId, userId, noProject)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('not found')
  })

  it('handles empty issues array', async () => {
    const empty: JiraSearchResult = { issues: [], total: 0, startAt: 0, maxResults: 50 }
    const result = await importIssuesFromJson(orgId, userId, empty)
    expect(result.created).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('extracts sequence number from key', async () => {
    await importIssuesFromJson(orgId, userId, sampleSearchResult)
    const t1 = await Ticket.findOne({ key: 'WEB-101', orgId })
    expect(t1?.sequenceNumber).toBe(101)
    const t2 = await Ticket.findOne({ key: 'WEB-102', orgId })
    expect(t2?.sequenceNumber).toBe(102)
  })

  it('sets source to jira with sourceId', async () => {
    await importIssuesFromJson(orgId, userId, sampleSearchResult)
    const t1 = await Ticket.findOne({ key: 'WEB-101', orgId })
    expect(t1?.source).toBe('jira')
    expect(t1?.sourceId).toBe('10100')
  })
})
