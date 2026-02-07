import { Elysia } from 'elysia'

export const healthController = new Elysia({ prefix: '/health' }).get(
  '/',
  () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }),
)
