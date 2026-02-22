import { Elysia, t } from 'elysia'
import { timeEntryDao, ticketDao } from 'services/src/dao'
import BadRequestError from '../../errors/BadRequestError'
import NotFoundError from '../../errors/NotFoundError'
import UnauthorizedError from '../../errors/UnauthorizedError'

export const timeentryController = new Elysia({
  prefix: '/org/:orgId/timeentry',
})
  .get('/', async ({ params: { orgId }, query, user }) => {
    if (!user) throw new UnauthorizedError()

    const startDate = new Date(query.startDate)
    const endDate = new Date(query.endDate)
    const userId = query.userId || user.id

    return timeEntryDao.findByUserAndDateRange(orgId, userId, startDate, endDate)
  })
  .get('/summary', async ({ params: { orgId }, query, user }) => {
    if (!user) throw new UnauthorizedError()

    const startDate = new Date(query.startDate)
    const endDate = new Date(query.endDate)

    return timeEntryDao.getSummaryByDateRange(
      orgId,
      startDate,
      endDate,
      query.userId,
    )
  })
  .post(
    '/',
    async ({ params: { orgId }, body, user }) => {
      if (!user) throw new UnauthorizedError()

      const ticket = await ticketDao.findById(body.ticketId)
      if (!ticket) throw new NotFoundError('Ticket not found')

      // Calculate duration from start/end time
      const [startH, startM] = body.startTime.split(':').map(Number)
      const [endH, endM] = body.endTime.split(':').map(Number)
      const durationMinutes = endH * 60 + endM - (startH * 60 + startM)

      if (durationMinutes <= 0) throw new BadRequestError('End time must be after start time')

      return timeEntryDao.create({
        orgId: orgId as unknown as import('mongoose').Types.ObjectId,
        userId: user.id as unknown as import('mongoose').Types.ObjectId,
        ticketId: body.ticketId as unknown as import('mongoose').Types.ObjectId,
        projectId: ticket.projectId,
        date: new Date(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        durationMinutes,
        description: body.description,
      })
    },
    {
      body: t.Object({
        ticketId: t.String(),
        date: t.String(),
        startTime: t.String(),
        endTime: t.String(),
        description: t.Optional(t.String()),
      }),
    },
  )
  .put(
    '/:id',
    async ({ params: { id }, body, user }) => {
      if (!user) throw new UnauthorizedError()

      const updateData: Record<string, unknown> = { ...body }

      if (body.startTime && body.endTime) {
        const [startH, startM] = body.startTime.split(':').map(Number)
        const [endH, endM] = body.endTime.split(':').map(Number)
        updateData.durationMinutes = endH * 60 + endM - (startH * 60 + startM)
      }

      if (body.date) updateData.date = new Date(body.date)

      if (body.ticketId) {
        const ticket = await ticketDao.findById(body.ticketId)
        if (ticket) updateData.projectId = ticket.projectId
      }

      const entry = await timeEntryDao.update(id, updateData)
      if (!entry) throw new NotFoundError('Time entry not found')
      return entry
    },
    {
      body: t.Object({
        ticketId: t.Optional(t.String()),
        date: t.Optional(t.String()),
        startTime: t.Optional(t.String()),
        endTime: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
    },
  )
  .delete('/:id', async ({ params: { id }, user }) => {
    if (!user) throw new UnauthorizedError()
    await timeEntryDao.delete(id)
    return { message: 'Time entry deleted' }
  })
