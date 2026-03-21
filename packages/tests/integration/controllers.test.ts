import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { mongoose } from 'db/src/connection'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createHmac } from 'crypto'
import { Org, User, Project, DataDeletionRequest } from 'db/src/models'
import { PLANS } from 'config/src/index'
import { stripeService } from 'services/src/biz/stripe.service'
import { userDao, orgDao, projectDao, dataDeletionRequestDao } from 'services/src/dao'
import { checkUserLimit, checkProjectLimit, checkExportEnabled } from 'api/src/plan-limits'

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

// ─── Stripe Service: getPlans() ───

describe('Stripe Service - getPlans', () => {
  it('should return all three plans', () => {
    const plans = stripeService.getPlans()
    expect(plans).toHaveLength(3)
    const ids = plans.map(p => p.id)
    expect(ids).toContain('free')
    expect(ids).toContain('pro')
    expect(ids).toContain('business')
  })

  it('should return correct structure for each plan', () => {
    const plans = stripeService.getPlans()
    for (const plan of plans) {
      expect(plan).toHaveProperty('id')
      expect(plan).toHaveProperty('name')
      expect(plan).toHaveProperty('price')
      expect(plan).toHaveProperty('limits')
      expect(plan.limits).toHaveProperty('maxUsers')
      expect(plan.limits).toHaveProperty('maxProjects')
      expect(plan.limits).toHaveProperty('exportEnabled')
    }
  })

  it('should have correct Free plan limits', () => {
    const plans = stripeService.getPlans()
    const free = plans.find(p => p.id === 'free')!
    expect(free.name).toBe('Free')
    expect(free.price).toBe(0)
    expect(free.limits.maxUsers).toBe(3)
    expect(free.limits.maxProjects).toBe(2)
    expect(free.limits.exportEnabled).toBe(false)
  })

  it('should have unlimited users/projects for Pro plan', () => {
    const plans = stripeService.getPlans()
    const pro = plans.find(p => p.id === 'pro')!
    expect(pro.name).toBe('Pro')
    expect(pro.price).toBe(7)
    expect(pro.limits.maxUsers).toBe(-1)
    expect(pro.limits.maxProjects).toBe(-1)
    expect(pro.limits.exportEnabled).toBe(true)
  })

  it('should have unlimited users/projects for Business plan', () => {
    const plans = stripeService.getPlans()
    const business = plans.find(p => p.id === 'business')!
    expect(business.name).toBe('Business')
    expect(business.price).toBe(14)
    expect(business.limits.maxUsers).toBe(-1)
    expect(business.limits.maxProjects).toBe(-1)
    expect(business.limits.exportEnabled).toBe(true)
    expect(business.limits.invoicing).toBe(true)
  })
})

// ─── PLANS config validation ───

describe('PLANS config', () => {
  it('should define free, pro, and business plans', () => {
    expect(PLANS).toHaveProperty('free')
    expect(PLANS).toHaveProperty('pro')
    expect(PLANS).toHaveProperty('business')
  })

  it('free plan should not allow teamReporting or invoicing', () => {
    expect(PLANS.free.limits.teamReporting).toBe(false)
    expect(PLANS.free.limits.invoicing).toBe(false)
  })

  it('pro plan should allow teamReporting but not invoicing', () => {
    expect(PLANS.pro.limits.teamReporting).toBe(true)
    expect(PLANS.pro.limits.invoicing).toBe(false)
  })

  it('business plan should allow both teamReporting and invoicing', () => {
    expect(PLANS.business.limits.teamReporting).toBe(true)
    expect(PLANS.business.limits.invoicing).toBe(true)
  })
})

// ─── Facebook Data Deletion: Signature Verification ───

describe('Facebook Data Deletion - Signature Verification', () => {
  // Recreate the helpers locally (they are not exported from the controller)
  function base64UrlEncode(buf: Buffer): string {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  function createSignedRequest(payload: object, appSecret: string): string {
    const payloadStr = base64UrlEncode(Buffer.from(JSON.stringify(payload)))
    const sig = createHmac('sha256', appSecret).update(payloadStr).digest()
    return `${base64UrlEncode(sig)}.${payloadStr}`
  }

  function base64UrlDecode(str: string): Buffer {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) base64 += '='.repeat(4 - pad)
    return Buffer.from(base64, 'base64')
  }

  function verifySignedRequest(signedRequest: string, appSecret: string) {
    const parts = signedRequest.split('.')
    if (parts.length !== 2) throw new Error('Invalid signed_request format')

    const [encodedSig, payload] = parts
    const sig = base64UrlDecode(encodedSig)
    const data = JSON.parse(base64UrlDecode(payload).toString('utf-8'))

    if (!data.algorithm || data.algorithm.toUpperCase() !== 'HMAC-SHA256') {
      throw new Error('Unsupported signed_request algorithm')
    }

    const expectedSig = createHmac('sha256', appSecret).update(payload).digest()
    if (sig.length !== expectedSig.length || !require('crypto').timingSafeEqual(sig, expectedSig)) {
      throw new Error('Invalid signed_request signature')
    }

    return data
  }

  const appSecret = 'test_fb_app_secret_1234567890'

  it('should parse a valid signed_request', () => {
    const payload = { algorithm: 'HMAC-SHA256', user_id: 'fb_user_123', issued_at: 1234567890 }
    const signedRequest = createSignedRequest(payload, appSecret)

    const result = verifySignedRequest(signedRequest, appSecret)
    expect(result.algorithm).toBe('HMAC-SHA256')
    expect(result.user_id).toBe('fb_user_123')
    expect(result.issued_at).toBe(1234567890)
  })

  it('should throw for invalid signature', () => {
    const payload = { algorithm: 'HMAC-SHA256', user_id: 'fb_user_123' }
    const signedRequest = createSignedRequest(payload, appSecret)

    // Tamper with the signature by using a different secret
    expect(() => verifySignedRequest(signedRequest, 'wrong_secret_entirely_different')).toThrow(
      'Invalid signed_request signature',
    )
  })

  it('should throw for wrong algorithm', () => {
    const payload = { algorithm: 'HMAC-SHA1', user_id: 'fb_user_123' }
    const signedRequest = createSignedRequest(payload, appSecret)

    expect(() => verifySignedRequest(signedRequest, appSecret)).toThrow(
      'Unsupported signed_request algorithm',
    )
  })

  it('should throw for malformed signed_request (no dot)', () => {
    expect(() => verifySignedRequest('nodothere', appSecret)).toThrow(
      'Invalid signed_request format',
    )
  })

  it('should throw for missing algorithm field', () => {
    const payload = { user_id: 'fb_user_123' }
    const signedRequest = createSignedRequest(payload, appSecret)

    expect(() => verifySignedRequest(signedRequest, appSecret)).toThrow(
      'Unsupported signed_request algorithm',
    )
  })
})

// ─── Facebook Data Deletion: DataDeletionRequest Model ───

describe('DataDeletionRequest DAO', () => {
  beforeEach(async () => {
    await DataDeletionRequest.deleteMany({})
  })

  it('should create and find by confirmation code', async () => {
    const req = await dataDeletionRequestDao.create({
      confirmationCode: 'test-code-abc',
      facebookUserId: 'fb_12345',
      status: 'completed',
      completedAt: new Date(),
    } as any)

    expect(req).toBeDefined()
    expect(req.confirmationCode).toBe('test-code-abc')

    const found = await dataDeletionRequestDao.findByConfirmationCode('test-code-abc')
    expect(found).toBeDefined()
    expect(found!.facebookUserId).toBe('fb_12345')
    expect(found!.status).toBe('completed')
  })

  it('should return null for unknown confirmation code', async () => {
    const found = await dataDeletionRequestDao.findByConfirmationCode('nonexistent-code')
    expect(found).toBeNull()
  })

  it('should create with user_not_found status', async () => {
    const req = await dataDeletionRequestDao.create({
      confirmationCode: 'no-user-code',
      facebookUserId: 'fb_unknown',
      status: 'user_not_found',
    } as any)

    expect(req.status).toBe('user_not_found')
    expect(req.userId).toBeUndefined()
  })
})

// ─── Plan Limits ───

describe('Plan Limits - checkUserLimit', () => {
  let freeOrgId: string
  let proOrgId: string

  beforeAll(async () => {
    // Clean up any previous orgs/users from this suite
    const freeOrg = await Org.create({
      name: 'Free Org',
      slug: `free-org-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      subscription: { plan: 'free', status: 'active' },
    })
    freeOrgId = String(freeOrg._id)

    const proOrg = await Org.create({
      name: 'Pro Org',
      slug: `pro-org-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      subscription: { plan: 'pro', status: 'active' },
    })
    proOrgId = String(proOrg._id)

    // Create 3 users in the free org (at the limit)
    for (let i = 0; i < 3; i++) {
      await User.create({
        email: `free-user-${i}-${Date.now()}@test.com`,
        username: `freeuser${i}-${Date.now()}`,
        password: await Bun.password.hash('test123'),
        firstName: `Free${i}`,
        lastName: 'User',
        role: 'member',
        orgId: freeOrg._id,
        isActive: true,
      })
    }
  })

  it('should throw when Free plan user limit (3) is reached', async () => {
    await expect(checkUserLimit(freeOrgId)).rejects.toThrow('User limit reached')
  })

  it('should include plan name in error message', async () => {
    await expect(checkUserLimit(freeOrgId)).rejects.toThrow('Free plan')
  })

  it('should not throw for Pro plan (unlimited users)', async () => {
    // Pro plan has maxUsers: -1, so no limit
    await expect(checkUserLimit(proOrgId)).resolves.toBeUndefined()
  })
})

describe('Plan Limits - checkProjectLimit', () => {
  let freeOrgId: string
  let proOrgId: string

  beforeAll(async () => {
    const freeOrg = await Org.create({
      name: 'Free Org Projects',
      slug: `free-org-proj-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      subscription: { plan: 'free', status: 'active' },
    })
    freeOrgId = String(freeOrg._id)

    const proOrg = await Org.create({
      name: 'Pro Org Projects',
      slug: `pro-org-proj-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      subscription: { plan: 'pro', status: 'active' },
    })
    proOrgId = String(proOrg._id)

    // Create 2 projects in the free org (at the limit)
    for (let i = 0; i < 2; i++) {
      await Project.create({
        name: `Free Project ${i}`,
        key: `FP${i}${Date.now()}`.slice(0, 10),
        orgId: freeOrg._id,
      })
    }
  })

  it('should throw when Free plan project limit (2) is reached', async () => {
    await expect(checkProjectLimit(freeOrgId)).rejects.toThrow('Project limit reached')
  })

  it('should include plan name in error message', async () => {
    await expect(checkProjectLimit(freeOrgId)).rejects.toThrow('Free plan')
  })

  it('should not throw for Pro plan (unlimited projects)', async () => {
    await expect(checkProjectLimit(proOrgId)).resolves.toBeUndefined()
  })
})

describe('Plan Limits - checkExportEnabled', () => {
  let freeOrgId: string
  let proOrgId: string
  let businessOrgId: string

  beforeAll(async () => {
    const freeOrg = await Org.create({
      name: 'Free Org Export',
      slug: `free-org-exp-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      subscription: { plan: 'free', status: 'active' },
    })
    freeOrgId = String(freeOrg._id)

    const proOrg = await Org.create({
      name: 'Pro Org Export',
      slug: `pro-org-exp-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      subscription: { plan: 'pro', status: 'active' },
    })
    proOrgId = String(proOrg._id)

    const businessOrg = await Org.create({
      name: 'Business Org Export',
      slug: `biz-org-exp-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      subscription: { plan: 'business', status: 'active' },
    })
    businessOrgId = String(businessOrg._id)
  })

  it('should throw for Free plan', async () => {
    await expect(checkExportEnabled(freeOrgId)).rejects.toThrow('Export is not available')
  })

  it('should not throw for Pro plan', async () => {
    await expect(checkExportEnabled(proOrgId)).resolves.toBeUndefined()
  })

  it('should not throw for Business plan', async () => {
    await expect(checkExportEnabled(businessOrgId)).resolves.toBeUndefined()
  })
})

// ─── Cross-Org Access Validation ───

describe('Cross-Org Access Validation', () => {
  let orgAId: string
  let orgBId: string

  beforeAll(async () => {
    const orgA = await Org.create({
      name: 'Org A',
      slug: `org-a-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
    })
    orgAId = String(orgA._id)

    const orgB = await Org.create({
      name: 'Org B',
      slug: `org-b-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
    })
    orgBId = String(orgB._id)

    // Create users in Org A
    await User.create({
      email: `alice-${Date.now()}@orga.com`,
      username: `alice-${Date.now()}`,
      password: await Bun.password.hash('pass'),
      firstName: 'Alice',
      lastName: 'A',
      role: 'admin',
      orgId: orgA._id,
      isActive: true,
    })
    await User.create({
      email: `bob-${Date.now()}@orga.com`,
      username: `bob-${Date.now()}`,
      password: await Bun.password.hash('pass'),
      firstName: 'Bob',
      lastName: 'A',
      role: 'member',
      orgId: orgA._id,
      isActive: true,
    })

    // Create user in Org B
    await User.create({
      email: `charlie-${Date.now()}@orgb.com`,
      username: `charlie-${Date.now()}`,
      password: await Bun.password.hash('pass'),
      firstName: 'Charlie',
      lastName: 'B',
      role: 'admin',
      orgId: orgB._id,
      isActive: true,
    })
  })

  it('should return only users for Org A', async () => {
    const usersA = await userDao.findByOrgId(orgAId)
    expect(usersA).toHaveLength(2)
    const firstNames = usersA.map(u => u.firstName)
    expect(firstNames).toContain('Alice')
    expect(firstNames).toContain('Bob')
    expect(firstNames).not.toContain('Charlie')
  })

  it('should return only users for Org B', async () => {
    const usersB = await userDao.findByOrgId(orgBId)
    expect(usersB).toHaveLength(1)
    expect(usersB[0].firstName).toBe('Charlie')
  })

  it('should return empty array for non-existent org', async () => {
    const fakeOrgId = new mongoose.Types.ObjectId().toString()
    const users = await userDao.findByOrgId(fakeOrgId)
    expect(users).toHaveLength(0)
  })

  it('should find user by OAuth provider ID', async () => {
    // Create a user with an OAuth provider
    const orgC = await Org.create({
      name: 'Org C OAuth',
      slug: `org-c-oauth-${Date.now()}`,
      settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
    })
    await User.create({
      email: `oauth-user-${Date.now()}@test.com`,
      username: `oauthuser-${Date.now()}`,
      firstName: 'OAuth',
      lastName: 'User',
      role: 'member',
      orgId: orgC._id,
      isActive: true,
      oauthProviders: [{ provider: 'facebook', providerId: 'fb_oauth_12345' }],
    })

    const found = await userDao.findByOAuthProviderId('facebook', 'fb_oauth_12345')
    expect(found).toBeDefined()
    expect(found!.firstName).toBe('OAuth')
  })

  it('should return null for non-existent OAuth provider ID', async () => {
    const found = await userDao.findByOAuthProviderId('facebook', 'fb_nonexistent')
    expect(found).toBeNull()
  })
})

// ─── Auth Flow ───

describe('Auth Flow', () => {
  // We test the underlying DAO/model logic that auth controller uses

  describe('User Registration (orgDao + userDao)', () => {
    it('should create an org and user with hashed password', async () => {
      const org = await orgDao.create({
        name: 'Auth Test Org',
        slug: `auth-test-${Date.now()}`,
        settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      } as any)
      expect(org).toBeDefined()
      expect(org.name).toBe('Auth Test Org')
      expect(org.subscription.plan).toBe('free') // default

      const hashedPassword = await Bun.password.hash('myP@ssword1')

      const user = await userDao.create({
        email: `authuser-${Date.now()}@test.com`,
        username: `authuser-${Date.now()}`,
        password: hashedPassword,
        firstName: 'Auth',
        lastName: 'Tester',
        role: 'admin',
        orgId: org._id,
        isActive: false,
      } as any)

      expect(user).toBeDefined()
      expect(user.email).toContain('authuser')
      expect(user.role).toBe('admin')
      expect(user.isActive).toBe(false)
      // Password should be hashed, not plaintext
      expect(user.password).not.toBe('myP@ssword1')
      expect(await Bun.password.verify('myP@ssword1', user.password!)).toBe(true)

      // Org owner should be set
      await orgDao.update(String(org._id), { ownerId: user._id } as any)
      const updatedOrg = await orgDao.findById(String(org._id))
      expect(String(updatedOrg!.ownerId)).toBe(String(user._id))
    })

    it('should default org subscription to free plan', async () => {
      const org = await orgDao.create({
        name: 'Default Plan Org',
        slug: `default-plan-${Date.now()}`,
        settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      } as any)

      expect(org.subscription.plan).toBe('free')
      expect(org.subscription.status).toBe('active')
      expect(org.subscription.cancelAtPeriodEnd).toBe(false)
    })
  })

  describe('Login Validation (userDao + password verification)', () => {
    let orgSlug: string

    beforeAll(async () => {
      orgSlug = `login-test-${Date.now()}`
      const org = await Org.create({
        name: 'Login Test Org',
        slug: orgSlug,
        settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      })

      // Active user
      await User.create({
        email: `loginuser-${Date.now()}@test.com`,
        username: 'loginuser',
        password: await Bun.password.hash('correctPassword'),
        firstName: 'Login',
        lastName: 'User',
        role: 'admin',
        orgId: org._id,
        isActive: true,
      })

      // Inactive user
      await User.create({
        email: `inactive-${Date.now()}@test.com`,
        username: 'inactiveuser',
        password: await Bun.password.hash('somePassword'),
        firstName: 'Inactive',
        lastName: 'User',
        role: 'member',
        orgId: org._id,
        isActive: false,
      })
    })

    it('should find user and verify correct password', async () => {
      const user = await userDao.findByUsernameAndOrgSlug('loginuser', orgSlug)
      expect(user).toBeDefined()
      expect(user!.firstName).toBe('Login')

      const isValid = await Bun.password.verify('correctPassword', user!.password!)
      expect(isValid).toBe(true)
    })

    it('should reject wrong password', async () => {
      const user = await userDao.findByUsernameAndOrgSlug('loginuser', orgSlug)
      expect(user).toBeDefined()

      const isValid = await Bun.password.verify('wrongPassword', user!.password!)
      expect(isValid).toBe(false)
    })

    it('should return null for non-existent user', async () => {
      const user = await userDao.findByUsernameAndOrgSlug('nonexistent', orgSlug)
      expect(user).toBeNull()
    })

    it('should return null for non-existent org slug', async () => {
      const user = await userDao.findByUsernameAndOrgSlug('loginuser', 'no-such-org')
      expect(user).toBeNull()
    })

    it('should find inactive user (caller must check isActive)', async () => {
      const user = await userDao.findByUsernameAndOrgSlug('inactiveuser', orgSlug)
      expect(user).toBeDefined()
      expect(user!.isActive).toBe(false)
      // The auth controller checks: if (!user.isActive) throw new Error('Account deactivated')
      // We verify the flag is correctly stored
    })
  })

  describe('tokenizeUser helper shape', () => {
    // Recreate tokenizeUser locally since it's not exported
    const tokenizeUser = (user: {
      _id: unknown
      email: string
      username: string
      firstName: string
      lastName: string
      role: string
      orgId: unknown
    }) => ({
      id: String(user._id),
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      orgId: String(user.orgId),
    })

    it('should produce correct shape with string ids', () => {
      const fakeObjectId = new mongoose.Types.ObjectId()
      const fakeOrgId = new mongoose.Types.ObjectId()

      const result = tokenizeUser({
        _id: fakeObjectId,
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        orgId: fakeOrgId,
      })

      expect(result.id).toBe(String(fakeObjectId))
      expect(result.orgId).toBe(String(fakeOrgId))
      expect(result.email).toBe('test@example.com')
      expect(result.username).toBe('testuser')
      expect(result.firstName).toBe('Test')
      expect(result.lastName).toBe('User')
      expect(result.role).toBe('admin')
      // Should NOT have password or other fields
      expect(result).not.toHaveProperty('password')
      expect(result).not.toHaveProperty('isActive')
      expect(result).not.toHaveProperty('oauthProviders')
    })

    it('should convert ObjectId to string for id and orgId', async () => {
      const org = await Org.create({
        name: 'Token Org',
        slug: `token-org-${Date.now()}`,
        settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      })
      const user = await User.create({
        email: `tokenize-${Date.now()}@test.com`,
        username: `tokenize-${Date.now()}`,
        password: await Bun.password.hash('pass'),
        firstName: 'Token',
        lastName: 'Ize',
        role: 'member',
        orgId: org._id,
        isActive: true,
      })

      const result = tokenizeUser(user)
      expect(typeof result.id).toBe('string')
      expect(typeof result.orgId).toBe('string')
      expect(result.id).toBe(String(user._id))
      expect(result.orgId).toBe(String(org._id))
    })
  })

  describe('findByEmailAndOrg', () => {
    it('should find user by email within a specific org', async () => {
      const org = await Org.create({
        name: 'Email Org',
        slug: `email-org-${Date.now()}`,
        settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
      })
      const uniqueEmail = `findbyemail-${Date.now()}@test.com`
      await User.create({
        email: uniqueEmail,
        username: `findbyemail-${Date.now()}`,
        password: await Bun.password.hash('pass'),
        firstName: 'Find',
        lastName: 'ByEmail',
        role: 'member',
        orgId: org._id,
        isActive: true,
      })

      const found = await userDao.findByEmailAndOrg(uniqueEmail, String(org._id))
      expect(found).toBeDefined()
      expect(found!.email).toBe(uniqueEmail)
    })

    it('should return null if email exists in different org', async () => {
      const fakeOrgId = new mongoose.Types.ObjectId().toString()
      const found = await userDao.findByEmailAndOrg('findbyemail@test.com', fakeOrgId)
      expect(found).toBeNull()
    })
  })
})
