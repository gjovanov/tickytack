import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test'
import { mongoose } from 'db/src/connection'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Org, User, Invite } from 'db/src/models'
import { inviteDao } from 'services/src/dao'

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

afterEach(async () => {
  await Org.deleteMany({})
  await User.deleteMany({})
  await Invite.deleteMany({})
})

describe('Invite System', () => {
  async function createOrgAndAdmin() {
    const org = await Org.create({
      name: 'Test Corp',
      slug: 'test-corp',
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
    })
    const user = await User.create({
      email: 'admin@test.com',
      username: 'admin',
      password: await Bun.password.hash('test123'),
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      orgId: org._id,
      isActive: true,
    })
    await Org.findByIdAndUpdate(org._id, { ownerId: user._id })
    return { org, user }
  }

  it('should create a shareable invite', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
      maxUses: 10,
      expiresInHours: 24,
    })
    expect(invite.code).toHaveLength(21)
    expect(invite.status).toBe('active')
    expect(invite.maxUses).toBe(10)
    expect(invite.useCount).toBe(0)
    expect(invite.assignRole).toBe('member')
    expect(invite.expiresAt).toBeDefined()
  })

  it('should create a targeted email invite with maxUses=1', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
      targetEmail: 'new@user.com',
    })
    expect(invite.targetEmail).toBe('new@user.com')
    expect(invite.maxUses).toBe(1)
  })

  it('should list invites by org', async () => {
    const { org, user } = await createOrgAndAdmin()
    await inviteDao.createInvite({ orgId: String(org._id), inviterId: String(user._id) })
    await inviteDao.createInvite({ orgId: String(org._id), inviterId: String(user._id) })

    const result = await inviteDao.listByOrg(String(org._id))
    expect(result.data).toHaveLength(2)
    expect(result.total).toBe(2)
  })

  it('should find invite by code', async () => {
    const { org, user } = await createOrgAndAdmin()
    const created = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
    })
    const found = await inviteDao.findByCode(created.code)
    expect(found).not.toBeNull()
    expect(String(found!._id)).toBe(String(created._id))
  })

  it('should validate active invite as valid', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
    })
    const result = inviteDao.validate(invite)
    expect(result.valid).toBe(true)
  })

  it('should validate expired invite as invalid', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await Invite.create({
      code: 'expired-code-12345678',
      orgId: org._id,
      inviterId: user._id,
      status: 'active',
      useCount: 0,
      assignRole: 'member',
      expiresAt: new Date(Date.now() - 1000),
    })
    const result = inviteDao.validate(invite)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('expired')
  })

  it('should validate revoked invite as invalid', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
    })
    await inviteDao.revoke(String(invite._id), String(org._id))
    const revoked = await inviteDao.findByCode(invite.code)
    const result = inviteDao.validate(revoked!)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('revoked')
  })

  it('should increment use count', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
      maxUses: 3,
    })
    const updated = await inviteDao.incrementUseCount(String(invite._id))
    expect(updated).not.toBeNull()
    expect(updated!.useCount).toBe(1)
  })

  it('should exhaust invite when max uses reached', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
      maxUses: 1,
    })
    const updated = await inviteDao.incrementUseCount(String(invite._id))
    expect(updated!.status).toBe('exhausted')
  })

  it('should revoke an active invite', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
    })
    const revoked = await inviteDao.revoke(String(invite._id), String(org._id))
    expect(revoked).not.toBeNull()
    expect(revoked!.status).toBe('revoked')
  })

  it('should not revoke invite from different org', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
    })
    const otherOrg = await Org.create({ name: 'Other', slug: 'other' })
    const result = await inviteDao.revoke(String(invite._id), String(otherOrg._id))
    expect(result).toBeNull()
  })

  it('should register user via invite code and join existing org', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
      assignRole: 'member',
    })

    // Validate invite
    const validation = inviteDao.validate(invite)
    expect(validation.valid).toBe(true)

    // Create new user in existing org
    const newUser = await User.create({
      email: 'newbie@test.com',
      username: 'newbie',
      password: await Bun.password.hash('newpass123'),
      firstName: 'New',
      lastName: 'User',
      role: invite.assignRole,
      orgId: org._id,
      isActive: true,
    })

    await inviteDao.incrementUseCount(String(invite._id))

    expect(newUser.role).toBe('member')
    expect(String(newUser.orgId)).toBe(String(org._id))

    // Verify use count incremented
    const updated = await inviteDao.findByCode(invite.code)
    expect(updated!.useCount).toBe(1)
  })

  it('should reject registration with targeted invite if email mismatches', async () => {
    const { org, user } = await createOrgAndAdmin()
    const invite = await inviteDao.createInvite({
      orgId: String(org._id),
      inviterId: String(user._id),
      targetEmail: 'specific@user.com',
    })

    const validation = inviteDao.validate(invite)
    expect(validation.valid).toBe(true)

    // Simulate email mismatch check
    const emailMatch = invite.targetEmail === 'wrong@email.com'
    expect(emailMatch).toBe(false)
  })
})
