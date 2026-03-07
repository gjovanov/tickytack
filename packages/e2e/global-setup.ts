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
    name: 'Acme Labs',
    slug: 'acme-labs',
    settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
  })

  // Create users
  const adminPassword = await Bun.password.hash('admin123')
  const memberPassword = await Bun.password.hash('member123')

  const admin = await User.create({
    email: 'sarah@acmelabs.io',
    username: 'sarahc',
    password: adminPassword,
    firstName: 'Sarah',
    lastName: 'Connor',
    role: 'admin',
    orgId: org._id,
    isActive: true,
  })

  const member = await User.create({
    email: 'mike@acmelabs.io',
    username: 'mikeb',
    password: memberPassword,
    firstName: 'Mike',
    lastName: 'Barnes',
    role: 'member',
    orgId: org._id,
    isActive: true,
  })

  // Set org owner
  await Org.findByIdAndUpdate(org._id, { ownerId: admin._id })

  // Create projects
  const webApp = await Project.create({
    name: 'Web Platform',
    key: 'WEB',
    description: 'Main web application',
    orgId: org._id,
    leadId: admin._id,
    color: '#1976D2',
    isActive: true,
  })

  const mobileApp = await Project.create({
    name: 'Mobile App',
    key: 'MOB',
    description: 'iOS and Android mobile app',
    orgId: org._id,
    leadId: admin._id,
    color: '#E65100',
    isActive: true,
  })

  // Create tickets
  const tickets = await Promise.all([
    Ticket.create({
      key: 'WEB-101',
      summary: 'Redesign dashboard layout',
      description: 'New grid-based responsive dashboard',
      projectId: webApp._id,
      orgId: org._id,
      reporterId: admin._id,
      assigneeId: admin._id,
      status: 'in_progress',
      priority: 'high',
      sequenceNumber: 101,
    }),
    Ticket.create({
      key: 'WEB-102',
      summary: 'Add dark mode support',
      projectId: webApp._id,
      orgId: org._id,
      reporterId: admin._id,
      assigneeId: member._id,
      status: 'open',
      priority: 'medium',
      sequenceNumber: 102,
    }),
    Ticket.create({
      key: 'MOB-100',
      summary: 'Push notification service',
      description: 'Firebase Cloud Messaging integration',
      projectId: mobileApp._id,
      orgId: org._id,
      reporterId: admin._id,
      assigneeId: admin._id,
      status: 'done',
      priority: 'high',
      sequenceNumber: 100,
    }),
    Ticket.create({
      key: 'MOB-101',
      summary: 'Offline sync engine',
      description: 'Background data sync with conflict resolution',
      projectId: mobileApp._id,
      orgId: org._id,
      reporterId: admin._id,
      assigneeId: member._id,
      status: 'in_progress',
      priority: 'highest',
      sequenceNumber: 101,
    }),
  ])

  // Create time entries for current week
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const timeEntries = [
    { userId: admin._id, ticketId: tickets[0]._id, projectId: webApp._id, dayOffset: 0, start: '08:00', end: '12:00' },
    { userId: admin._id, ticketId: tickets[2]._id, projectId: mobileApp._id, dayOffset: 0, start: '13:00', end: '17:00' },
    { userId: admin._id, ticketId: tickets[0]._id, projectId: webApp._id, dayOffset: 1, start: '08:00', end: '11:00' },
    { userId: admin._id, ticketId: tickets[3]._id, projectId: mobileApp._id, dayOffset: 1, start: '11:30', end: '17:00' },
    { userId: admin._id, ticketId: tickets[2]._id, projectId: mobileApp._id, dayOffset: 2, start: '09:00', end: '12:30' },
    { userId: admin._id, ticketId: tickets[3]._id, projectId: mobileApp._id, dayOffset: 2, start: '13:30', end: '17:00' },
    { userId: member._id, ticketId: tickets[1]._id, projectId: webApp._id, dayOffset: 3, start: '08:00', end: '12:00' },
    { userId: member._id, ticketId: tickets[3]._id, projectId: mobileApp._id, dayOffset: 3, start: '13:00', end: '17:00' },
    { userId: admin._id, ticketId: tickets[0]._id, projectId: webApp._id, dayOffset: 4, start: '08:00', end: '12:00' },
    { userId: member._id, ticketId: tickets[1]._id, projectId: webApp._id, dayOffset: 4, start: '09:00', end: '15:00' },
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
  console.log(`  Users: sarahc (admin), mikeb (member)`)
  console.log(`  Projects: WEB, MOB`)
  console.log(`  Tickets: 4`)
  console.log(`  Time entries: ${timeEntries.length}`)

  await disconnectDB()
}

export default globalSetup

// Allow running directly via `bun run global-setup.ts`
if (import.meta.main) {
  await globalSetup()
}
