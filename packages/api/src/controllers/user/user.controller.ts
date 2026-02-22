import { Elysia, t } from 'elysia'
import { userDao } from 'services/src/dao'
import BadRequestError from '../../errors/BadRequestError'
import NotFoundError from '../../errors/NotFoundError'
import UnauthorizedError from '../../errors/UnauthorizedError'

export const userController = new Elysia({ prefix: '/org/:orgId/user' })
  .get('/', async ({ params: { orgId }, user }) => {
    if (!user) throw new UnauthorizedError()
    return userDao.findByOrgId(orgId)
  })
  .post(
    '/',
    async ({ params: { orgId }, body, user }) => {
      if (!user || (user.role !== 'admin' && user.role !== 'manager'))
        throw new UnauthorizedError('Forbidden')

      const hashedPassword = await Bun.password.hash(body.password)
      try {
        return await userDao.create({
          ...body,
          password: hashedPassword,
          orgId: orgId as unknown as import('mongoose').Types.ObjectId,
        })
      } catch (err: any) {
        if (err.code === 11000) {
          throw new BadRequestError('User with this email or username already exists')
        }
        throw err
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        username: t.String({ minLength: 3 }),
        password: t.String({ minLength: 6 }),
        firstName: t.String(),
        lastName: t.String(),
        role: t.Optional(
          t.Union([
            t.Literal('admin'),
            t.Literal('manager'),
            t.Literal('member'),
          ]),
        ),
      }),
    },
  )
  .put(
    '/:userId',
    async ({ params: { userId }, body, user }) => {
      if (!user || (user.role !== 'admin' && user.role !== 'manager'))
        throw new UnauthorizedError('Forbidden')

      const updateData: Record<string, unknown> = { ...body }
      if (body.password) {
        updateData.password = await Bun.password.hash(body.password)
      }
      const updated = await userDao.update(userId, updateData)
      if (!updated) throw new NotFoundError('User not found')
      return updated
    },
    {
      body: t.Object({
        email: t.Optional(t.String({ format: 'email' })),
        username: t.Optional(t.String()),
        password: t.Optional(t.String({ minLength: 6 })),
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        role: t.Optional(
          t.Union([
            t.Literal('admin'),
            t.Literal('manager'),
            t.Literal('member'),
          ]),
        ),
        isActive: t.Optional(t.Boolean()),
      }),
    },
  )
  .delete('/:userId', async ({ params: { userId }, user }) => {
    if (!user || user.role !== 'admin') throw new UnauthorizedError('Forbidden')
    await userDao.delete(userId)
    return { message: 'User deleted' }
  })
