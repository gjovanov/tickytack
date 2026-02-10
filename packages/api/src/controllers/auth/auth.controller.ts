import { Elysia } from 'elysia'
import { orgDao, userDao, inviteDao } from 'services/src/dao'
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
      const { email, username, password, firstName, lastName, orgName, orgSlug, inviteCode } = body

      let org: any
      let role = 'admin'

      if (inviteCode) {
        // Invite-based registration: join existing org
        const invite = await inviteDao.findByCode(inviteCode)
        if (!invite) throw new Error('Invalid invite code')

        const validation = inviteDao.validate(invite)
        if (!validation.valid) throw new Error(validation.reason || 'Invite is not valid')

        if (invite.targetEmail && invite.targetEmail !== email) {
          throw new Error('This invite is for a different email address')
        }

        org = await orgDao.findById(invite.orgId)
        if (!org) throw new Error('Organization not found')

        role = invite.assignRole || 'member'

        // Increment use count
        const updated = await inviteDao.incrementUseCount(String(invite._id))
        if (!updated) throw new Error('Invite could not be used')
      } else {
        // Normal registration: create new org
        if (!orgName || !orgSlug) throw new Error('Organization name and slug are required')

        const existingOrg = await orgDao.findBySlug(orgSlug)
        if (existingOrg) throw new Error('Organization slug already exists')

        org = await orgDao.create({
          name: orgName,
          slug: orgSlug.toLowerCase(),
          settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
        })
      }

      const hashedPassword = await Bun.password.hash(password)

      const user = await userDao.create({
        email,
        username,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        orgId: org._id,
        isActive: true,
      })

      if (!inviteCode) {
        // Set org owner for new orgs only
        await orgDao.update(org._id, { ownerId: user._id })
      }

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
