import { Elysia } from 'elysia'
import { orgDao, userDao } from 'services/src/dao'
import { authRegister, authLogin, authMe, authLogout } from './auth.route'
import type { UserTokenized } from '../../types'

const tokenizeUser = (user: {
  _id: unknown
  email: string
  username: string
  firstName: string
  lastName: string
  role: string
  orgId: unknown
}): UserTokenized => ({
  id: String(user._id),
  email: user.email,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  orgId: String(user.orgId),
})

export const authController = new Elysia({ prefix: '/auth' })
  .post(
    authRegister.path,
    async ({ jwt, body, cookie: { auth } }) => {
      const { email, username, password, firstName, lastName, orgName, orgSlug } = body

      const existingOrg = await orgDao.findBySlug(orgSlug)
      if (existingOrg) {
        throw new Error('Organization slug already exists')
      }

      const hashedPassword = await Bun.password.hash(password)

      const org = await orgDao.create({
        name: orgName,
        slug: orgSlug.toLowerCase(),
        settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      })

      const user = await userDao.create({
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'admin',
        orgId: org._id,
        isActive: true,
      })

      // Set org owner
      await orgDao.update(org._id, { ownerId: user._id })

      const userTokenized = tokenizeUser(user)
      const accessToken: string = await jwt.sign(userTokenized)
      auth.set({
        value: accessToken,
        httpOnly: true,
        maxAge: 24 * 86400,
        path: '/',
      })

      return {
        user: { ...userTokenized },
        token: accessToken,
        org: { id: String(org._id), name: org.name, slug: org.slug },
      }
    },
    authRegister.schema,
  )
  .post(
    authLogin.path,
    async ({ jwt, body: { username, password, orgSlug }, cookie: { auth } }) => {
      const user = await userDao.findByUsernameAndOrgSlug(username, orgSlug)
      if (!user) throw new Error('Invalid credentials')

      if (!user.password) throw new Error('Please login with your OAuth provider')
      const isValid = await Bun.password.verify(password, user.password)
      if (!isValid) throw new Error('Invalid credentials')

      if (!user.isActive) throw new Error('Account deactivated')

      const org = await orgDao.findById(user.orgId)
      if (!org) throw new Error('Organization not found')

      const userTokenized = tokenizeUser(user)
      const accessToken: string = await jwt.sign(userTokenized)
      auth.set({
        value: accessToken,
        httpOnly: true,
        maxAge: 24 * 86400,
        path: '/',
      })

      return {
        user: { ...userTokenized },
        token: accessToken,
        org: { id: String(org._id), name: org.name, slug: org.slug },
      }
    },
    authLogin.schema,
  )
  .get(authMe.path, async ({ user }) => {
    if (!user) throw new Error('Unauthorized')

    const dbUser = await userDao.findById(user.id)
    if (!dbUser) throw new Error('User not found')

    const org = await orgDao.findById(dbUser.orgId)

    return {
      user: tokenizeUser(dbUser),
      org: org
        ? { id: String(org._id), name: org.name, slug: org.slug }
        : null,
    }
  })
  .post(authLogout.path, async ({ cookie: { auth } }) => {
    auth.remove()
    return { message: 'Logged out' }
  })
