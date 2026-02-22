import { connectDB, disconnectDB } from 'db/src/connection'
import { Org, User, Project, Ticket, TimeEntry, Invite } from 'db/src/models'
import { addDays, startOfWeek } from 'date-fns'

async function globalSetup() {
  await connectDB()

  // Clean existing data
  await Promise.all([
    Org.deleteMany({}),
    User.deleteMany({}),
    Project.deleteMany({}),
    Ticket.deleteMany({}),
    TimeEntry.deleteMany({}),
    Invite.deleteMany({}),
  ])

  // Create org
  const org = await Org.create({
    name: 'OEBB',
    slug: 'oebb',
    settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
  })

  // Create users
  const adminPassword = await Bun.password.hash('admin123')
  const memberPassword = await Bun.password.hash('member123')

  const gjovanov = await User.create({
    email: 'gjovanov@oebb.at',
    username: 'gjovanov',
    password: adminPassword,
    firstName: 'Goran',
    lastName: 'Jovanov',
    role: 'admin',
    orgId: org._id,
    isActive: true,
  })

  const cburker = await User.create({
    email: 'cburker@oebb.at',
    username: 'cburker',
    password: memberPassword,
    firstName: 'Christian',
    lastName: 'Burker',
    role: 'member',
    orgId: org._id,
    isActive: true,
  })

  // Set org owner
  await Org.findByIdAndUpdate(org._id, { ownerId: gjovanov._id })

  // Create projects
  const pconClassic = await Project.create({
    name: 'PCON Classic',
    key: 'PCLASS',
    description: 'PCON Classic project',
    orgId: org._id,
    leadId: gjovanov._id,
    color: '#1976D2',
    isActive: true,
  })

  const pconPlus = await Project.create({
    name: 'PCON Plus',
    key: 'PPLUS',
    description: 'PCON Plus project',
    orgId: org._id,
    leadId: gjovanov._id,
    color: '#E65100',
    isActive: true,
  })

  // Create tickets
  const tickets = await Promise.all([
    Ticket.create({
      key: 'PCLASS-101',
      summary: 'Fix report generation',
      description: 'Report 830 generation is slow',
      projectId: pconClassic._id,
      orgId: org._id,
      reporterId: gjovanov._id,
      assigneeId: gjovanov._id,
      status: 'in_progress',
      priority: 'high',
      sequenceNumber: 101,
    }),
    Ticket.create({
      key: 'PCLASS-102',
      summary: 'Update database schema',
      projectId: pconClassic._id,
      orgId: org._id,
      reporterId: gjovanov._id,
      assigneeId: cburker._id,
      status: 'open',
      priority: 'medium',
      sequenceNumber: 102,
    }),
    Ticket.create({
      key: 'PPLUS-100',
      summary: 'Implement auth module',
      description: 'JWT authentication with Elysia',
      projectId: pconPlus._id,
      orgId: org._id,
      reporterId: gjovanov._id,
      assigneeId: gjovanov._id,
      status: 'done',
      priority: 'high',
      sequenceNumber: 100,
    }),
    Ticket.create({
      key: 'PPLUS-101',
      summary: 'Create timesheet UI',
      description: 'Weekly calendar view for time tracking',
      projectId: pconPlus._id,
      orgId: org._id,
      reporterId: gjovanov._id,
      assigneeId: cburker._id,
      status: 'in_progress',
      priority: 'highest',
      sequenceNumber: 101,
    }),
  ])

  // Create time entries for current week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const timeEntries = [
    { userId: gjovanov._id, ticketId: tickets[0]._id, projectId: pconClassic._id, dayOffset: 0, start: '08:00', end: '12:00' },
    { userId: gjovanov._id, ticketId: tickets[2]._id, projectId: pconPlus._id, dayOffset: 0, start: '13:00', end: '17:00' },
    { userId: gjovanov._id, ticketId: tickets[0]._id, projectId: pconClassic._id, dayOffset: 1, start: '08:00', end: '11:00' },
    { userId: gjovanov._id, ticketId: tickets[3]._id, projectId: pconPlus._id, dayOffset: 1, start: '11:30', end: '17:00' },
    { userId: gjovanov._id, ticketId: tickets[2]._id, projectId: pconPlus._id, dayOffset: 2, start: '09:00', end: '12:30' },
    { userId: gjovanov._id, ticketId: tickets[3]._id, projectId: pconPlus._id, dayOffset: 2, start: '13:30', end: '17:00' },
    { userId: cburker._id, ticketId: tickets[1]._id, projectId: pconClassic._id, dayOffset: 3, start: '08:00', end: '12:00' },
    { userId: cburker._id, ticketId: tickets[3]._id, projectId: pconPlus._id, dayOffset: 3, start: '13:00', end: '17:00' },
    { userId: gjovanov._id, ticketId: tickets[0]._id, projectId: pconClassic._id, dayOffset: 4, start: '08:00', end: '12:00' },
    { userId: cburker._id, ticketId: tickets[1]._id, projectId: pconClassic._id, dayOffset: 4, start: '09:00', end: '15:00' },
  ]

  for (const te of timeEntries) {
    const date = addDays(weekStart, te.dayOffset)
    const [sh, sm] = te.start.split(':').map(Number)
    const [eh, em] = te.end.split(':').map(Number)
    const duration = eh * 60 + em - (sh * 60 + sm)

    await TimeEntry.create({
      orgId: org._id,
      userId: te.userId,
      ticketId: te.ticketId,
      projectId: te.projectId,
      date,
      startTime: te.start,
      endTime: te.end,
      durationMinutes: duration,
    })
  }

  console.log('E2E Global Setup: Seed completed')
  console.log(`  Org: ${org.name} (${org.slug})`)
  console.log(`  Users: gjovanov (admin), cburker (member)`)
  console.log(`  Projects: PCLASS, PPLUS`)
  console.log(`  Tickets: 4`)
  console.log(`  Time entries: ${timeEntries.length}`)

  await disconnectDB()
}

export default globalSetup

// Allow running directly via `bun run global-setup.ts`
if (import.meta.main) {
  await globalSetup()
}
