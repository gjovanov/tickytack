import { Elysia, t } from 'elysia'
import { ticketDao, projectDao } from 'services/src/dao'
import NotFoundError from '../../errors/NotFoundError'
import UnauthorizedError from '../../errors/UnauthorizedError'

export const ticketController = new Elysia({
  prefix: '/org/:orgId/project/:projectId/ticket',
})
  .get('/', async ({ params: { orgId, projectId } }) => {
    return ticketDao.findByOrgId(orgId, projectId)
  })
  .post(
    '/',
    async ({ params: { orgId, projectId }, body, user }) => {
      if (!user) throw new UnauthorizedError()

      const project = await projectDao.findById(projectId)
      if (!project) throw new NotFoundError('Project not found')

      const seqNum = await ticketDao.getNextSequenceNumber(projectId)
      const key = `${project.key}-${seqNum}`

      return ticketDao.create({
        ...body,
        key,
        sequenceNumber: seqNum,
        projectId: projectId as unknown as import('mongoose').Types.ObjectId,
        orgId: orgId as unknown as import('mongoose').Types.ObjectId,
        reporterId: user.id as unknown as import('mongoose').Types.ObjectId,
      })
    },
    {
      body: t.Object({
        summary: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        assigneeId: t.Optional(t.String()),
        status: t.Optional(
          t.Union([
            t.Literal('open'),
            t.Literal('in_progress'),
            t.Literal('done'),
            t.Literal('closed'),
          ]),
        ),
        priority: t.Optional(
          t.Union([
            t.Literal('lowest'),
            t.Literal('low'),
            t.Literal('medium'),
            t.Literal('high'),
            t.Literal('highest'),
          ]),
        ),
        estimatedHours: t.Optional(t.Number()),
      }),
    },
  )
  .get('/:ticketId', async ({ params: { ticketId } }) => {
    const ticket = await ticketDao.findById(ticketId)
    if (!ticket) throw new NotFoundError('Ticket not found')
    return ticket
  })
  .put(
    '/:ticketId',
    async ({ params: { ticketId }, body }) => {
      const ticket = await ticketDao.update(ticketId, body)
      if (!ticket) throw new NotFoundError('Ticket not found')
      return ticket
    },
    {
      body: t.Object({
        summary: t.Optional(t.String()),
        description: t.Optional(t.String()),
        assigneeId: t.Optional(t.String()),
        status: t.Optional(
          t.Union([
            t.Literal('open'),
            t.Literal('in_progress'),
            t.Literal('done'),
            t.Literal('closed'),
          ]),
        ),
        priority: t.Optional(
          t.Union([
            t.Literal('lowest'),
            t.Literal('low'),
            t.Literal('medium'),
            t.Literal('high'),
            t.Literal('highest'),
          ]),
        ),
        estimatedHours: t.Optional(t.Number()),
      }),
    },
  )
  .delete('/:ticketId', async ({ params: { ticketId }, user }) => {
    if (!user) throw new UnauthorizedError()
    await ticketDao.delete(ticketId)
    return { message: 'Ticket deleted' }
  })
