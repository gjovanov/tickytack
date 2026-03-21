import { Elysia } from 'elysia'
import { orgDao, userDao, inviteDao, codeDao } from 'services/src/dao'
import { sendEmail } from 'services/src/biz/email.service'
import { config } from 'config/src'
import { authRegister, authLogin, authMe, authLogout, authActivate } from './auth.route'
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
        isActive: false,
      })

      if (!inviteCode) {
        // Set org owner for new orgs only
        await orgDao.update(org._id, { ownerId: user._id })
      }

      // Generate activation code and send email
      const { token: activationToken } = await codeDao.createActivationCode(String(user._id), config.email.activationTokenTtlMinutes)

      const activationUrl = `${config.email.appUrl}/auth/activate?userId=${user._id}&token=${activationToken}`
      await sendEmail({
        to: email,
        subject: 'Activate your TickyTack account',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Welcome to TickyTack, ${firstName}!</h2>
<p>Please activate your account by clicking the button below. This link expires in ${config.email.activationTokenTtlMinutes} minutes.</p>
<p style="margin: 32px 0;">
  <a href="${activationUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
    Activate Account
  </a>
</p>
<p>Or copy this link: <a href="${activationUrl}">${activationUrl}</a></p>
<p style="color:#999;font-size:12px;">If you did not create an account, you can safely ignore this email.</p>
</div>`,
      }).catch(err => console.warn('Failed to send activation email:', err))

      return {
        message: 'Registration successful. Please check your email to activate your account.',
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
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
  .post(
    authActivate.path,
    async ({ body: { userId, token } }) => {
      const code = await codeDao.findActivationCode(userId, token)
      if (!code) throw new Error('Invalid or expired activation token')

      const user = await userDao.findById(userId)
      if (!user) throw new Error('User not found')

      user.isActive = true
      await user.save()

      await codeDao.deleteForUser(userId)

      // Send success email (non-fatal)
      await sendEmail({
        to: user.email,
        subject: 'Your TickyTack account is active',
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Your account is active, ${user.firstName}!</h2>
<p>Welcome to TickyTack. You can now <a href="${config.email.appUrl}/auth/login">sign in</a>.</p>
</div>`,
      }).catch(err => console.warn('Failed to send activation success email:', err))

      return { message: 'Account activated successfully. You can now sign in.' }
    },
    authActivate.schema,
  )
  .get(authMe.path, async ({ user }) => {
    if (!user) throw new Error('Unauthorized')

    const dbUser = await userDao.findById(user.id)
    if (!dbUser) throw new Error('User not found')

    const org = await orgDao.findById(dbUser.orgId)

    return {
      user: tokenizeUser(dbUser),
      org: org
        ? {
            id: String(org._id),
            name: org.name,
            slug: org.slug,
            subscription: org.subscription
              ? {
                  plan: org.subscription.plan,
                  status: org.subscription.status,
                  currentPeriodEnd: org.subscription.currentPeriodEnd || null,
                  cancelAtPeriodEnd: org.subscription.cancelAtPeriodEnd || false,
                }
              : { plan: 'free', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false },
          }
        : null,
    }
  })
  .post(authLogout.path, async ({ cookie: { auth } }) => {
    auth.remove()
    return { message: 'Logged out' }
  })
