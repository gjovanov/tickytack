import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mongoose } from 'db/src/connection'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { User, Org } from 'db/src/models'
import {
  buildAuthUrl,
  getOrCreateUser,
  registerWithOAuth,
  parseState,
  type OAuthUserInfo,
} from 'services/src/biz/oauth.service'

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())

  // Set test OAuth env vars
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-google-id'
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-google-secret'
  process.env.GITHUB_CLIENT_ID = 'test-github-id'
  process.env.GITHUB_CLIENT_SECRET = 'test-github-secret'
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

async function createTestOrg(slug: string) {
  const org = await Org.create({
    name: `${slug} Corp`,
    slug,
    settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
  })
  return org
}

describe('OAuth Flow', () => {
  it('should build auth URL for google', () => {
    const url = buildAuthUrl('google', 'test-corp')
    expect(url).toContain('accounts.google.com')
    expect(url).toContain('client_id=')
    expect(url).toContain('state=')
  })

  it('should build auth URL for github', () => {
    const url = buildAuthUrl('github', 'test-corp')
    expect(url).toContain('github.com/login/oauth/authorize')
    expect(url).toContain('client_id=')
  })

  it('should throw for unknown provider', () => {
    expect(() => buildAuthUrl('unknown', 'test-corp')).toThrow('Unknown OAuth provider')
  })

  it('should parse state with orgSlug', () => {
    const state = Buffer.from(JSON.stringify({ orgSlug: 'my-org', nonce: 'abc' })).toString('base64url')
    const parsed = parseState(state)
    expect(parsed.orgSlug).toBe('my-org')
  })

  it('should throw on invalid state', () => {
    expect(() => parseState('not-valid')).toThrow('Invalid OAuth state')
  })

  it('should create new user from OAuth info', async () => {
    const org = await createTestOrg('oauth-new')

    const info: OAuthUserInfo = {
      provider: 'google',
      providerId: 'g-123',
      email: 'oauthuser@test.com',
      name: 'OAuth User',
      avatarUrl: 'https://example.com/pic.jpg',
    }

    const { user, isNew } = await getOrCreateUser(info, 'oauth-new')

    expect(isNew).toBe(true)
    expect(user.email).toBe('oauthuser@test.com')
    expect(user.firstName).toBe('OAuth')
    expect(user.lastName).toBe('User')
    expect(user.role).toBe('member')
    expect(user.orgId).toBe(String(org._id))

    const dbUser = await User.findOne({ email: 'oauthuser@test.com' })
    expect(dbUser).not.toBeNull()
    expect(dbUser!.oauthProviders).toHaveLength(1)
    expect(dbUser!.oauthProviders[0].provider).toBe('google')
    expect(dbUser!.oauthProviders[0].providerId).toBe('g-123')
    expect(dbUser!.password).toBeUndefined()
  })

  it('should link OAuth to existing user by email', async () => {
    const org = await createTestOrg('oauth-link')

    // Create existing user with password
    const hashedPassword = await Bun.password.hash('test123')
    await User.create({
      email: 'existing@link.com',
      username: 'existing',
      password: hashedPassword,
      firstName: 'Existing',
      lastName: 'User',
      role: 'admin',
      orgId: org._id,
      isActive: true,
    })

    const info: OAuthUserInfo = {
      provider: 'github',
      providerId: 'gh-456',
      email: 'existing@link.com',
      name: 'GitHub User',
    }

    const { user, isNew } = await getOrCreateUser(info, 'oauth-link')

    expect(isNew).toBe(false)
    expect(user.username).toBe('existing')

    const dbUser = await User.findOne({ email: 'existing@link.com' })
    expect(dbUser!.oauthProviders).toHaveLength(1)
    expect(dbUser!.oauthProviders[0].provider).toBe('github')
    expect(dbUser!.password).toBeDefined() // keeps existing password
  })

  it('should not duplicate OAuth provider on re-login', async () => {
    const org = await createTestOrg('oauth-nodup')

    const info: OAuthUserInfo = {
      provider: 'google',
      providerId: 'g-789',
      email: 'nodup@test.com',
      name: 'NoDup User',
    }

    await getOrCreateUser(info, 'oauth-nodup')
    await getOrCreateUser(info, 'oauth-nodup')

    const dbUser = await User.findOne({ email: 'nodup@test.com' })
    expect(dbUser!.oauthProviders).toHaveLength(1)
  })

  it('should throw if org not found', async () => {
    const info: OAuthUserInfo = {
      provider: 'google',
      providerId: 'g-999',
      email: 'nobody@test.com',
      name: 'Nobody',
    }

    expect(getOrCreateUser(info, 'nonexistent')).rejects.toThrow('not found')
  })

  it('should build auth URL with mode=register (no orgSlug)', () => {
    const url = buildAuthUrl('google', undefined, 'register')
    expect(url).toContain('accounts.google.com')
    expect(url).toContain('client_id=')
    const stateMatch = url.match(/state=([^&]+)/)
    expect(stateMatch).not.toBeNull()
    const decoded = JSON.parse(Buffer.from(decodeURIComponent(stateMatch![1]), 'base64url').toString('utf8'))
    expect(decoded.mode).toBe('register')
    expect(decoded.orgSlug).toBeUndefined()
  })

  it('should parse state with mode=register', () => {
    const state = Buffer.from(JSON.stringify({ mode: 'register', nonce: '456' })).toString('base64url')
    const parsed = parseState(state)
    expect(parsed.mode).toBe('register')
    expect(parsed.orgSlug).toBeUndefined()
  })

  it('should register new user+org with OAuth (registerWithOAuth)', async () => {
    const info: OAuthUserInfo = {
      provider: 'google',
      providerId: 'g-reg-001',
      email: 'newadmin@oauthreg.com',
      name: 'OAuth Admin',
      avatarUrl: 'https://example.com/avatar.jpg',
    }

    const { user, isNew } = await registerWithOAuth(info, 'OAuth Reg Org', 'oauth-reg-org', 'oauthadmin')

    expect(isNew).toBe(true)
    expect(user.email).toBe('newadmin@oauthreg.com')
    expect(user.username).toBe('oauthadmin')
    expect(user.firstName).toBe('OAuth')
    expect(user.lastName).toBe('Admin')
    expect(user.role).toBe('admin')

    // Verify org created
    const org = await Org.findOne({ slug: 'oauth-reg-org' })
    expect(org).not.toBeNull()
    expect(org!.name).toBe('OAuth Reg Org')
    expect(String(org!.ownerId)).toBe(user.id)

    // Verify user in DB
    const dbUser = await User.findOne({ email: 'newadmin@oauthreg.com' })
    expect(dbUser).not.toBeNull()
    expect(dbUser!.oauthProviders).toHaveLength(1)
    expect(dbUser!.oauthProviders[0].provider).toBe('google')
    expect(dbUser!.oauthProviders[0].providerId).toBe('g-reg-001')
    expect(dbUser!.password).toBeUndefined()
    expect(String(dbUser!.orgId)).toBe(String(org!._id))
  })

  it('should reject registerWithOAuth if org slug is taken', async () => {
    const org = await createTestOrg('taken-org')

    const info: OAuthUserInfo = {
      provider: 'github',
      providerId: 'gh-reg-001',
      email: 'oauth@taken.com',
      name: 'OAuth User',
    }

    expect(registerWithOAuth(info, 'Another Org', 'taken-org', 'oauthuser')).rejects.toThrow('already taken')
  })
})
