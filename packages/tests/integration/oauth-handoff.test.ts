/**
 * No credential in a URL: the OAuth callback, the OAuth registration and the activation link.
 *
 * The callback used to finish with the token in the redirect URL, and registration carried the
 * pending identity as a URL parameter. These tests drive the real controllers over HTTP (only the
 * provider round trip and the mailer are stubbed) and pin the replacement: a one-time server-side
 * record whose code lives in an httpOnly cookie.
 */
import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test'
import { fileURLToPath } from 'url'
import { mongoose } from 'db/src/connection'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Org, User } from 'db/src/models'
import * as realOAuth from 'services/src/biz/oauth.service'
import type { OAuthUserInfo } from 'services/src/biz/oauth.service'
import * as realEmail from 'services/src/biz/email.service'

// Resolve elysia and the jwt plugin from the api package, so the app built here uses the SAME
// Elysia instance as the controllers it mounts (the tests package does not depend on either).
const apiDir = fileURLToPath(new URL('../../api/', import.meta.url))
const { Elysia } = await import(Bun.resolveSync('elysia', apiDir))
const { jwt } = await import(Bun.resolveSync('@elysiajs/jwt', apiDir))

const FRONTEND = process.env.OAUTH_FRONTEND_URL || 'http://localhost:3000'

// The provider says who the browser is; everything after that is real.
let providerIdentity: OAuthUserInfo = {
  provider: 'google',
  providerId: 'g-handoff-1',
  email: 'handoff@test.com',
  name: 'Handoff User',
}
mock.module('services/src/biz/oauth.service', () => ({
  ...realOAuth,
  exchangeCodeForToken: async () => 'provider-access-token',
  fetchUserInfo: async () => providerIdentity,
}))

const sentMail: { to: string; html: string }[] = []
mock.module('services/src/biz/email.service', () => ({
  ...realEmail,
  sendEmail: async (opts: { to: string; html: string }) => {
    sentMail.push(opts)
  },
}))

const { authController } = await import('api/src/controllers/auth/auth.controller')
const { oauthController } = await import('api/src/controllers/auth/oauth.controller')

const app = new Elysia()
  .use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET as string }))
  .group('/api', (a: any) => a.use(authController).use(oauthController))

const signer = new Elysia().use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET as string }))

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-google-id'
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-google-secret'
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
})

const state = (s: Record<string, unknown>) => Buffer.from(JSON.stringify({ nonce: 'n', ...s })).toString('base64url')

async function call(method: string, path: string, opts: { cookie?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {}
  if (opts.cookie) headers.cookie = opts.cookie
  if (opts.body !== undefined) headers['content-type'] = 'application/json'
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
  )
}

/** `name=value` for one cookie a response set, or '' when it set none. */
function cookieFrom(res: Response, name: string): string {
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(';')
    if (pair.startsWith(`${name}=`) && pair.length > name.length + 1) return pair
  }
  return ''
}

/**
 * The response deletes the cookie. ⚠ With the cookie's own Path: a deletion without one applies
 * to the request's directory, which is a different cookie, and the real one stays in the jar.
 */
function expectCleared(res: Response, name: string, path: string) {
  const deletion = res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`)) || ''
  expect(deletion).toMatch(new RegExp(`^${name}=;`))
  expect(deletion).toMatch(/Max-Age=0/i)
  expect(deletion).toMatch(new RegExp(`Path=${path}(;|$)`, 'i'))
}

/** Nothing that could be a credential: no token-ish key, and no JWT anywhere in the address. */
function expectNoCredential(location: string) {
  expect(location).not.toMatch(/token=|eyJ[A-Za-z0-9_-]{5,}/)
}

describe('OAuth sign-in: no credential in the callback URL', () => {
  it('the callback redirect carries no token', async () => {
    await Org.create({ name: 'Handoff Corp', slug: 'handoff-corp', settings: { weekStartsOn: 1, workingHoursPerDay: 8 } })
    providerIdentity = { provider: 'google', providerId: 'g-login-1', email: 'login@handoff.com', name: 'Login User' }

    const res = await call('GET', `/api/oauth/callback/google?code=c&state=${state({ orgSlug: 'handoff-corp', mode: 'login' })}`)
    expect(res.status).toBe(302)
    const location = res.headers.get('location') || ''
    expectNoCredential(location)
    expect(location).toBe(`${FRONTEND}/auth/oauth-callback`)
  })

  it('the redeem signs in only the browser holding the handoff cookie, and only once', async () => {
    providerIdentity = { provider: 'google', providerId: 'g-login-2', email: 'redeem@handoff.com', name: 'Redeem User' }
    const cb = await call('GET', `/api/oauth/callback/google?code=c&state=${state({ orgSlug: 'handoff-corp', mode: 'login' })}`)
    const handoff = cookieFrom(cb, 'oauth_handoff')
    expect(handoff).not.toBe('')
    expect(cb.headers.getSetCookie().join('\n')).toMatch(/oauth_handoff=[^;]+;.*HttpOnly/i)

    const first = await call('POST', '/api/auth/oauth-code/redeem', { cookie: handoff })
    expect(first.status).toBe(200)
    const body = (await first.json()) as any
    expect(body.user.email).toBe('redeem@handoff.com')
    expect(body.org.slug).toBe('handoff-corp')
    const claims = (await signer.decorator.jwt.verify(body.token)) as any
    expect(claims.email).toBe('redeem@handoff.com')
    expectCleared(first, 'oauth_handoff', '/api/auth')

    const second = await call('POST', '/api/auth/oauth-code/redeem', { cookie: handoff })
    expect(second.status).toBe(400)
  })

  it('a token offered in the URL or the body is not a credential', async () => {
    const user = await User.findOne({ email: 'redeem@handoff.com' })
    const offered: string = await signer.decorator.jwt.sign({ id: String(user!._id), email: user!.email })

    const res = await call('POST', `/api/auth/oauth-code/redeem?token=${offered}`, { body: { token: offered } })
    expect(res.status).toBe(400)
  })

  it('stores only a hash of the code', async () => {
    const cb = await call('GET', `/api/oauth/callback/google?code=c&state=${state({ orgSlug: 'handoff-corp', mode: 'login' })}`)
    const code = cookieFrom(cb, 'oauth_handoff').split('=')[1]
    const raw = JSON.stringify(await mongoose.connection.collection('oauthhandoffs').find({}).toArray())
    expect(code.length).toBeGreaterThan(20)
    expect(raw).not.toContain(code)
  })
})

describe('OAuth registration: no pending token in the URL', () => {
  it('the register-mode redirect carries no pending token', async () => {
    providerIdentity = { provider: 'google', providerId: 'g-reg-1', email: 'newcomer@handoff.com', name: 'New Comer' }
    const res = await call('GET', `/api/oauth/callback/google?code=c&state=${state({ mode: 'register' })}`)
    expect(res.status).toBe(302)
    const location = res.headers.get('location') || ''
    expectNoCredential(location)
    expect(location.startsWith(`${FRONTEND}/auth/register`)).toBe(true)
  })

  it('a pending token from the body is refused; only the cookie registers', async () => {
    // A pending token of the shape the previous flow carried in the URL.
    const offered: string = await signer.decorator.jwt.sign({
      type: 'oauth_pending',
      email: 'body@example.test',
      name: 'Body Token',
      provider: 'google',
      providerId: 'g-body',
    } as any)
    const res = await call('POST', '/api/oauth/register-oauth', {
      body: { oauthToken: offered, orgName: 'Body Org', orgSlug: 'body-org', username: 'body_user' },
    })
    expect(res.status).toBe(400)
    expect(await Org.findOne({ slug: 'body-org' })).toBeNull()
    expect(await User.findOne({ email: 'body@example.test' })).toBeNull()
  })

  it('the pending cookie prefills, registers once, and survives a failed attempt', async () => {
    providerIdentity = { provider: 'google', providerId: 'g-reg-2', email: 'founder@handoff.com', name: 'Found Er' }
    const cb = await call('GET', `/api/oauth/callback/google?code=c&state=${state({ mode: 'register' })}`)
    const pending = cookieFrom(cb, 'oauth_pending')
    expect(pending).not.toBe('')

    const prefill = await call('GET', '/api/oauth/pending', { cookie: pending })
    expect(prefill.status).toBe(200)
    const who = (await prefill.json()) as any
    expect(who.email).toBe('founder@handoff.com')
    expect(who.name).toBe('Found Er')

    // A taken slug fails, and must leave the pending registration usable for a retry.
    const taken = await call('POST', '/api/oauth/register-oauth', {
      cookie: pending,
      body: { orgName: 'Taken', orgSlug: 'handoff-corp', username: 'founder' },
    })
    expect(taken.status).toBe(400)

    const ok = await call('POST', '/api/oauth/register-oauth', {
      cookie: pending,
      body: { orgName: 'Founders', orgSlug: 'founders', username: 'founder' },
    })
    expect(ok.status).toBe(200)
    expectCleared(ok, 'oauth_pending', '/api/oauth')
    const body = (await ok.json()) as any
    expect(body.org.slug).toBe('founders')
    const user = await User.findOne({ email: 'founder@handoff.com' })
    expect(user?.oauthProviders?.[0]?.providerId).toBe('g-reg-2')

    const again = await call('POST', '/api/oauth/register-oauth', {
      cookie: pending,
      body: { orgName: 'Twice', orgSlug: 'twice', username: 'founder2' },
    })
    expect(again.status).toBe(400)
    expect(await Org.findOne({ slug: 'twice' })).toBeNull()
  })
})

describe('Activation link', () => {
  it('carries the code in the fragment, never in the query', async () => {
    sentMail.length = 0
    const res = await call('POST', '/api/auth/register', {
      body: {
        email: 'activate@handoff.com',
        username: 'activator',
        password: 'secret123',
        firstName: 'Act',
        lastName: 'Ivate',
        orgName: 'Activate Org',
        orgSlug: 'activate-org',
      },
    })
    expect(res.status).toBe(200)
    const mail = sentMail.find((m) => m.to === 'activate@handoff.com')
    expect(mail).toBeDefined()
    const links = mail!.html.match(/https?:\/\/[^"<\s]+\/auth\/activate[^"<\s]*/g) || []
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).not.toContain('?')
      expect(link).toMatch(/\/auth\/activate#userId=[a-f0-9]{24}&token=/)
    }
  })
})
