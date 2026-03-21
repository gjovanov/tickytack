import { Elysia, t } from 'elysia'
import { projectDao } from 'services/src/dao'
import BadRequestError from '../../errors/BadRequestError'
import NotFoundError from '../../errors/NotFoundError'
import UnauthorizedError from '../../errors/UnauthorizedError'
import { checkProjectLimit } from '../../plan-limits'

export const projectController = new Elysia({
  prefix: '/org/:orgId/project',
})
  .get('/', async ({ params: { orgId }, user }) => {
    if (!user) throw new UnauthorizedError()
    if (user.orgId !== orgId) throw new UnauthorizedError('Forbidden')
    return projectDao.findByOrgId(orgId)
  })
  .post(
    '/',
    async ({ params: { orgId }, body, user }) => {
      if (!user || (user.role !== 'admin' && user.role !== 'manager'))
        throw new UnauthorizedError('Forbidden')
      if (user.orgId !== orgId) throw new UnauthorizedError('Forbidden')

      await checkProjectLimit(orgId)
      try {
        return await projectDao.create({
          ...body,
          orgId: orgId as unknown as import('mongoose').Types.ObjectId,
        })
      } catch (err: any) {
        if (err.code === 11000) {
          throw new BadRequestError(`Project with key "${body.key}" already exists`)
        }
        throw err
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        key: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        leadId: t.Optional(t.String()),
        color: t.Optional(t.String()),
      }),
    },
  )
  .get('/:projectId', async ({ params: { projectId }, user }) => {
    if (!user) throw new UnauthorizedError()
    const project = await projectDao.findById(projectId)
    if (!project) throw new NotFoundError('Project not found')
    return project
  })
  .put(
    '/:projectId',
    async ({ params: { orgId, projectId }, body, user }) => {
      if (!user || (user.role !== 'admin' && user.role !== 'manager'))
        throw new UnauthorizedError('Forbidden')
      if (user.orgId !== orgId) throw new UnauthorizedError('Forbidden')

      const project = await projectDao.update(projectId, body)
      if (!project) throw new NotFoundError('Project not found')
      return project
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        key: t.Optional(t.String()),
        description: t.Optional(t.String()),
        leadId: t.Optional(t.String()),
        color: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
      }),
    },
  )
  .delete('/:projectId', async ({ params: { projectId }, user }) => {
    if (!user || user.role !== 'admin') throw new UnauthorizedError('Forbidden')
    await projectDao.delete(projectId)
    return { message: 'Project deleted' }
  })
