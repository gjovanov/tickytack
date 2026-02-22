import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mongoose } from 'db/src/connection'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Org, User, Project, Ticket, TimeEntry } from 'db/src/models'

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

describe('Full flow integration', () => {
  it('register → create project → create ticket → log time', async () => {
    // 1. Create org
    const org = await Org.create({
      name: 'Test Corp',
      slug: 'test-corp',
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
    })

    // 2. Create user (simulating register)
    const hashedPassword = await Bun.password.hash('test123')
    const user = await User.create({
      email: 'admin@test.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      orgId: org._id,
      isActive: true,
    })

    // Verify password
    const isValid = await Bun.password.verify('test123', user.password)
    expect(isValid).toBe(true)

    // 3. Create project
    const project = await Project.create({
      name: 'Test Project',
      key: 'TST',
      orgId: org._id,
      leadId: user._id,
      color: '#FF5722',
    })
    expect(project.key).toBe('TST')

    // 4. Create ticket
    const ticket = await Ticket.create({
      key: 'TST-100',
      summary: 'Implement feature X',
      projectId: project._id,
      orgId: org._id,
      reporterId: user._id,
      assigneeId: user._id,
      status: 'open',
      priority: 'high',
      sequenceNumber: 100,
    })
    expect(ticket.key).toBe('TST-100')

    // 5. Log time
    const timeEntry = await TimeEntry.create({
      orgId: org._id,
      userId: user._id,
      ticketId: ticket._id,
      projectId: project._id,
      date: new Date('2025-01-06'),
      startTime: '09:00',
      endTime: '12:00',
      durationMinutes: 180,
      description: 'Worked on feature X',
    })
    expect(timeEntry.durationMinutes).toBe(180)

    // 6. Verify query
    const entries = await TimeEntry.find({
      orgId: org._id,
      userId: user._id,
    })
      .populate('ticketId')
      .populate('projectId')
    expect(entries.length).toBe(1)
    expect((entries[0].ticketId as any).key).toBe('TST-100')
    expect((entries[0].projectId as any).key).toBe('TST')
  })

  it('duplicate project key throws error', async () => {
    const org = await Org.create({ name: 'Dup Test', slug: `dup-${Date.now()}` })
    await Project.create({ name: 'First', key: 'DUP', orgId: org._id })
    await expect(
      Project.create({ name: 'Second', key: 'DUP', orgId: org._id }),
    ).rejects.toThrow()
  })

  it('pixel-to-time: computes correct start/end with 15-min snapping', () => {
    const START_HOUR = 6
    const MAX_MINUTES = 16 * 60 // 960

    function snapMinutes(minutes: number) {
      return Math.min(Math.max(Math.round(minutes / 15) * 15, 0), MAX_MINUTES)
    }

    function minutesToTime(minutes: number) {
      const totalMinutes = minutes + START_HOUR * 60
      const h = Math.floor(totalMinutes / 60)
      const m = totalMinutes % 60
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    // 10:00 = 4h from 06:00 = 240px, 12:00 = 6h = 360px
    const startMin = snapMinutes(Math.floor(240))
    const endMin = snapMinutes(Math.floor(360))
    expect(minutesToTime(startMin)).toBe('10:00')
    expect(minutesToTime(endMin)).toBe('12:00')

    // 08:37 → snaps to 08:30 (157px → 150 minutes offset)
    const mid = snapMinutes(Math.floor(157))
    expect(minutesToTime(mid)).toBe('08:30')

    // 14:22 → snaps to 14:15 (502px → 500 → snap to 495)
    const afternoon = snapMinutes(Math.floor(502))
    expect(minutesToTime(afternoon)).toBe('14:15')

    // Edge: 0px → 06:00
    expect(minutesToTime(snapMinutes(0))).toBe('06:00')

    // Edge: beyond max → clamped to 22:00
    expect(minutesToTime(snapMinutes(1200))).toBe('22:00')
  })

  it('upward drag normalization: swaps times when end < start', () => {
    const START_HOUR = 6
    const MAX_MINUTES = 16 * 60

    function snapMinutes(minutes: number) {
      return Math.min(Math.max(Math.round(minutes / 15) * 15, 0), MAX_MINUTES)
    }

    function minutesToTime(minutes: number) {
      const totalMinutes = minutes + START_HOUR * 60
      const h = Math.floor(totalMinutes / 60)
      const m = totalMinutes % 60
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }

    // Simulate upward drag: start at 12:00 (360px), end at 10:00 (240px)
    let startMin = snapMinutes(Math.floor(360))
    let endMin = snapMinutes(Math.floor(240))

    // Normalize: swap if start > end
    if (startMin > endMin) {
      ;[startMin, endMin] = [endMin, startMin]
    }

    expect(minutesToTime(startMin)).toBe('10:00')
    expect(minutesToTime(endMin)).toBe('12:00')
  })

  it('multi-tenancy: users in different orgs are isolated', async () => {
    const orgA = await Org.create({ name: 'Org A', slug: 'org-a' })
    const orgB = await Org.create({ name: 'Org B', slug: 'org-b' })

    const hash = await Bun.password.hash('pass')

    await User.create({
      email: 'user@a.com', username: 'usera', password: hash,
      firstName: 'A', lastName: 'User', role: 'admin', orgId: orgA._id,
    })

    await User.create({
      email: 'user@b.com', username: 'userb', password: hash,
      firstName: 'B', lastName: 'User', role: 'admin', orgId: orgB._id,
    })

    // Each org sees only its own users
    const usersA = await User.find({ orgId: orgA._id })
    const usersB = await User.find({ orgId: orgB._id })
    expect(usersA.length).toBe(1)
    expect(usersB.length).toBe(1)
    expect(usersA[0].username).toBe('usera')
    expect(usersB[0].username).toBe('userb')
  })
})
