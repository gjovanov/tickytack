import { Elysia, t } from 'elysia'
import { orgDao } from 'services/src/dao'
import BadRequestError from '../../errors/BadRequestError'
import NotFoundError from '../../errors/NotFoundError'
import UnauthorizedError from '../../errors/UnauthorizedError'

export const orgController = new Elysia({ prefix: '/org' })
  .get('/', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    return orgDao.findByOwnerId(user.id)
  })
  .post(
    '/',
    async ({ body, user }) => {
      if (!user || user.role !== 'admin') throw new UnauthorizedError('Forbidden')
      try {
        const org = await orgDao.create({
          ...body,
          ownerId: user.id,
          settings: { weekStartsOn: 1, workingHoursPerDay: body.settings?.workingHoursPerDay || 8 },
        })
        return org
      } catch (err: any) {
        if (err.code === 11000) throw new BadRequestError('Organization slug already exists')
        throw err
      }
    },
    {
      body: t.Object({
        name: t.String(),
        slug: t.String(),
        description: t.Optional(t.String()),
        settings: t.Optional(
          t.Object({
            workingHoursPerDay: t.Optional(t.Number()),
          }),
        ),
      }),
    },
  )
  .get('/:orgId', async ({ params: { orgId }, user }) => {
    if (!user) throw new UnauthorizedError()
    const org = await orgDao.findById(orgId)
    if (!org) throw new NotFoundError('Organization not found')
    return org
  })
  .put(
    '/:orgId',
    async ({ params: { orgId }, body, user }) => {
      if (!user || user.role !== 'admin') throw new UnauthorizedError('Forbidden')
      const org = await orgDao.update(orgId, body)
      if (!org) throw new NotFoundError('Organization not found')
      return org
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        settings: t.Optional(
          t.Object({
            weekStartsOn: t.Optional(t.Number()),
            workingHoursPerDay: t.Optional(t.Number()),
          }),
        ),
      }),
    },
  )
  .delete('/:orgId', async ({ params: { orgId }, user }) => {
    if (!user || user.role !== 'admin') throw new UnauthorizedError('Forbidden')
    await orgDao.delete(orgId)
    return { message: 'Organization deleted' }
  })
