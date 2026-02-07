import { Elysia } from 'elysia'
import { ticketDao } from 'services/src/dao'

export const ticketSearchController = new Elysia({
  prefix: '/org/:orgId/ticket',
})
  .get('/search', async ({ params: { orgId }, query, user }) => {
    if (!user) throw new Error('Unauthorized')
    return ticketDao.searchByKey(orgId, query.q || '')
  })
