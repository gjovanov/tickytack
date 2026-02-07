import { Elysia, t } from 'elysia'
import { orgDao } from 'services/src/dao'

export const orgController = new Elysia({ prefix: '/org' })
  .get('/', async ({ user }) => {
    if (!user) throw new Error('Unauthorized')
    // Return orgs the user belongs to (via their orgId)
    const org = await orgDao.findById(user.orgId)
    return org ? [org] : []
  })
  .get('/:orgId', async ({ params: { orgId }, user }) => {
    if (!user) throw new Error('Unauthorized')
    const org = await orgDao.findById(orgId)
    if (!org) throw new Error('Organization not found')
    return org
  })
  .put(
    '/:orgId',
    async ({ params: { orgId }, body, user }) => {
      if (!user || user.role !== 'admin') throw new Error('Forbidden')
      const org = await orgDao.update(orgId, body)
      if (!org) throw new Error('Organization not found')
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
    if (!user || user.role !== 'admin') throw new Error('Forbidden')
    await orgDao.delete(orgId)
    return { message: 'Organization deleted' }
  })
