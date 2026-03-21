import { Elysia } from 'elysia'
import { ticketDao } from 'services/src/dao'
import UnauthorizedError from '../../errors/UnauthorizedError'

export const ticketSearchController = new Elysia({
  prefix: '/org/:orgId/ticket',
})
  .get('/search', async ({ params: { orgId }, query, user }) => {
    if (!user) throw new UnauthorizedError()
    if (user.orgId !== orgId) throw new UnauthorizedError('Forbidden')
    // Escape regex special characters to prevent ReDoS
    const safeQuery = (query.q || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return ticketDao.searchByKey(orgId, safeQuery)
  })
