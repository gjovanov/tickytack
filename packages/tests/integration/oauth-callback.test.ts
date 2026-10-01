/**
 * The OAuth callback, driven over HTTP through the real controllers. Only the provider's side is
 * faked, at the network: the code exchange answers with a token, and each provider's user-info
 * endpoint answers the way that provider does. The mailer is stubbed.
 *
 * - No credential in a URL: the sign-in and the pending registration travel in one-time
 *   server-side records whose codes live in httpOnly cookies, and the activation link carries its
 *   code in the fragment.
 * - Naming an organization is not membership: an identity that is not already a member needs a
 *   valid invite for that org.
 * - An email is only as good as the provider's word for it: an existing member's account is
 *   linked to a new identity only on an email the provider verified.
 * - `state` is bound to the browser that started the flow, by a cookie that browser holds.
 *
 * These are separate on purpose. A matching state proves only that the browser finishing the flow
 * is the one that started it, which is just as true of someone signing in to an org they were
 * never invited to, or under an email address that is not theirs.
 */
import { describe, it, expect, beforeAll, afterAll, mock } from 'bun:test'
import { randomBytes } from 'crypto'
import { fileURLToPath } from 'url'
import { mongoose } from 'db/src/connection'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Org, User, Invite } from 'db/src/models'
import * as realOAuth from 'services/src/biz/oauth.service'
import * as realEmail from 'services/src/biz/email.service'

// Resolve elysia and the jwt plugin from the api package, so the app built here uses the SAME
// Elysia instance as the controllers it mounts (the tests package does not depend on either).
const apiDir = fileURLToPath(new URL('../../api/', import.meta.url))
const { Elysia } = await import(Bun.resolveSync('elysia', apiDir))
const { jwt } = await import(Bun.resolveSync('@elysiajs/jwt', apiDir))

const FRONTEND = process.env.OAUTH_FRONTEND_URL || 'http://localhost:3000'

mock.module('services/src/biz/oauth.service', () => ({
  ...realOAuth,
  exchangeCodeForToken: async () => 'provider-access-token',
}))

const sentMail: { to: string; html: string }[] = []
mock.module('services/src/biz/email.service', () => ({
  ...realEmail,
  sendEmail: async (opts: { to: string; html: string }) => {
    sentMail.push(opts)
  },
}))

/** What each provider's user-info endpoint says about the account signing in. */
const says: Record<string, any> = {}
const realFetch = globalThis.fetch
const providerApis = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url.startsWith('https://www.googleapis.com/userinfo/v2/me')) return Response.json(says.google)
  if (url.startsWith('https://graph.microsoft.com/v1.0/me')) return Response.json(says.microsoft)
  if (url.startsWith('https://api.github.com/user/emails')) return Response.json(says.githubEmails)
  if (url.startsWith('https://api.github.com/user')) return Response.json(says.github)
  if (url.startsWith('https://api.linkedin.com/v2/userinfo')) return Response.json(says.linkedin)
  if (url.startsWith('https://graph.facebook.com/')) return Response.json(says.facebook)
  return realFetch(input, init)
}) as typeof fetch

/** A Google account; Google reports whether it verified the address. */
function google(id: string, email: string, verified = true, name = 'Some One') {
  says.google = { id, email, name, verified_email: verified }
}

const { authController } = await import('api/src/controllers/auth/auth.controller')
const { oauthController } = await import('api/src/controllers/auth/oauth.controller')
const { fetchUserInfo } = await import('services/src/biz/oauth.service')

const app = new Elysia()
  .use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET as string }))
  .group('/api', (a: any) => a.use(authController).use(oauthController))

const signer = new Elysia().use(jwt({ name: 'jwt', secret: process.env.JWT_SECRET as string }))

let mongoServer: MongoMemoryServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  for (const [id, secret] of [
    ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
    ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
    ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
    ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    ['FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'],
  ]) {
    process.env[id] = `test-${id}`
    process.env[secret] = `test-${secret}`
  }
  globalThis.fetch = providerApis
})

afterAll(async () => {
  globalThis.fetch = realFetch
  await mongoose.disconnect()
  await mongoServer.stop()
})

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

/** A refused callback: back to the login page with the reason, and no session of any kind. */
function expectRefused(res: Response, reason: string) {
  expect(res.headers.get('location')).toBe(`${FRONTEND}/auth/login?error=${reason}`)
  expect(cookieFrom(res, 'oauth_handoff')).toBe('')
  expect(cookieFrom(res, 'auth')).toBe('')
}

type Flow = { provider: string; state: string; cookie: string }

/** Start a flow the way a browser does: the `state` sent to the provider, and the cookies set. */
async function startFlow(query: string, provider = 'google'): Promise<Flow> {
  const res = await call('GET', `/api/oauth/${provider}?${query}`)
  expect(res.status).toBe(302)
  const state = new URL(res.headers.get('location') || '').searchParams.get('state') || ''
  expect(state).not.toBe('')
  const cookie = [cookieFrom(res, 'oauth_state'), cookieFrom(res, 'oauth_invite')].filter(Boolean).join('; ')
  return { provider, state, cookie }
}

/** The provider sends the browser back with the `state` it was given. */
function finish(flow: Flow) {
  return call('GET', `/api/oauth/callback/${flow.provider}?code=c&state=${encodeURIComponent(flow.state)}`, {
    cookie: flow.cookie,
  })
}

async function redeemedEmail(res: Response): Promise<string> {
  const redeem = await call('POST', '/api/auth/oauth-code/redeem', { cookie: cookieFrom(res, 'oauth_handoff') })
  return ((await redeem.json()) as any).user?.email
}

const org = (slug: string) =>
  Org.create({ name: `${slug} Corp`, slug, settings: { weekStartsOn: 1, workingHoursPerDay: 8 } })

async function member(email: string, orgId: unknown, fields: Record<string, unknown> = {}) {
  return User.create({
    email,
    username: email.split('@')[0].replace(/[^a-z0-9_]/g, '_'),
    firstName: 'Mem',
    lastName: 'Ber',
    role: 'member',
    orgId,
    isActive: true,
    ...fields,
  })
}

async function invite(orgId: unknown, fields: Record<string, unknown> = {}) {
  const owner = await User.findOne({ orgId })
  return Invite.create({
    code: `inv-${Math.random().toString(36).slice(2)}`,
    orgId,
    inviterId: owner?._id ?? new mongoose.Types.ObjectId(),
    status: 'active',
    useCount: 0,
    assignRole: 'member',
    maxUses: 1,
    ...fields,
  })
}

const handoffCount = () => mongoose.connection.collection('oauthhandoffs').countDocuments()

describe('OAuth sign-in: no credential in the callback URL', () => {
  it('the callback redirect carries no token', async () => {
    const handoffCorp = await org('handoff-corp')
    await member('login@handoff.com', handoffCorp._id)
    google('g-login-1', 'login@handoff.com')

    const res = await finish(await startFlow('org_slug=handoff-corp'))
    expect(res.status).toBe(302)
    const location = res.headers.get('location') || ''
    expectNoCredential(location)
    expect(location).toBe(`${FRONTEND}/auth/oauth-callback`)
  })

  it('the redeem signs in only the browser holding the handoff cookie, and only once', async () => {
    const handoffCorp = await Org.findOne({ slug: 'handoff-corp' })
    await member('redeem@handoff.com', handoffCorp!._id)
    google('g-login-2', 'redeem@handoff.com')
    const cb = await finish(await startFlow('org_slug=handoff-corp'))
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
    google('g-login-2', 'redeem@handoff.com')
    const cb = await finish(await startFlow('org_slug=handoff-corp'))
    const code = cookieFrom(cb, 'oauth_handoff').split('=')[1]
    const raw = JSON.stringify(await mongoose.connection.collection('oauthhandoffs').find({}).toArray())
    expect(code.length).toBeGreaterThan(20)
    expect(raw).not.toContain(code)
  })
})

describe('OAuth registration: no pending token in the URL', () => {
  it('the register-mode redirect carries no pending token', async () => {
    google('g-reg-1', 'newcomer@handoff.com', true, 'New Comer')
    const res = await finish(await startFlow('mode=register'))
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
    google('g-reg-2', 'founder@handoff.com', true, 'Found Er')
    const cb = await finish(await startFlow('mode=register'))
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

describe('OAuth sign-in: naming an organization is not membership', () => {
  it('refuses a stranger with no invite, creates nothing, and answers as for an unknown org', async () => {
    const closed = await org('closed-corp')
    await member('owner@closed-corp.test', closed._id)
    google('g-stranger', 'stranger@example.test')
    const handoffsBefore = await handoffCount()

    const res = await finish(await startFlow('org_slug=closed-corp'))

    expect(await User.countDocuments({ email: 'stranger@example.test', orgId: closed._id })).toBe(0)
    expectRefused(res, 'no_access')
    expect(await handoffCount()).toBe(handoffsBefore)

    // The same answer for an org that does not exist: the refusal says nothing about which do.
    const unknown = await finish(await startFlow('org_slug=no-such-org'))
    expectRefused(unknown, 'no_access')
  })

  it('still signs in an existing member, with no invite', async () => {
    const members = await org('members-corp')
    await member('owner@members-corp.test', members._id)
    google('g-owner', 'owner@members-corp.test')

    const res = await finish(await startFlow('org_slug=members-corp'))

    expect(res.headers.get('location')).toBe(`${FRONTEND}/auth/oauth-callback`)
    expect(await redeemedEmail(res)).toBe('owner@members-corp.test')
    expect(await User.countDocuments({ orgId: members._id })).toBe(1)
  })

  it('admits a stranger holding a valid invite, with the invite’s role, and spends the invite', async () => {
    const closed = await Org.findOne({ slug: 'closed-corp' })
    const inv = await invite(closed!._id, { assignRole: 'manager' })
    google('g-stranger', 'stranger@example.test')

    const res = await finish(await startFlow(`org_slug=closed-corp&invite_code=${inv.code}`))

    expect(res.headers.get('location')).toBe(`${FRONTEND}/auth/oauth-callback`)
    const joined = await User.findOne({ email: 'stranger@example.test', orgId: closed!._id })
    expect(joined?.role).toBe('manager')
    const spent = await Invite.findById(inv._id)
    expect(spent?.useCount).toBe(1)
    expect(spent?.status).toBe('exhausted')
  })

  it('refuses an invite issued by a different organization', async () => {
    await org('target-corp')
    const other = await org('other-corp')
    const inv = await invite(other._id)
    google('g-cross', 'cross@example.test')

    const res = await finish(await startFlow(`org_slug=target-corp&invite_code=${inv.code}`))

    expect(await User.countDocuments({ email: 'cross@example.test' })).toBe(0)
    expectRefused(res, 'invite')
    expect((await Invite.findById(inv._id))?.useCount).toBe(0)
  })

  it('refuses an invite pinned to another email address', async () => {
    const pinned = await org('pinned-corp')
    const inv = await invite(pinned._id, { targetEmail: 'the.real.hire@example.test' })
    google('g-pinned', 'someone.else@example.test')

    const res = await finish(await startFlow(`org_slug=pinned-corp&invite_code=${inv.code}`))

    expect(await User.countDocuments({ email: 'someone.else@example.test' })).toBe(0)
    expectRefused(res, 'invite_email')
  })

  it('refuses an unknown invite code, and lets a single-use invite admit only one person', async () => {
    const once = await org('once-corp')
    google('g-bad', 'bad.code@example.test')
    const bad = await finish(await startFlow('org_slug=once-corp&invite_code=not-a-real-code'))
    expect(await User.countDocuments({ email: 'bad.code@example.test' })).toBe(0)
    expectRefused(bad, 'invite')

    const inv = await invite(once._id)
    google('g-first', 'first@example.test')
    const first = await finish(await startFlow(`org_slug=once-corp&invite_code=${inv.code}`))
    expect(first.headers.get('location')).toBe(`${FRONTEND}/auth/oauth-callback`)

    google('g-second', 'second@example.test')
    const second = await finish(await startFlow(`org_slug=once-corp&invite_code=${inv.code}`))
    expect(await User.countDocuments({ email: 'second@example.test' })).toBe(0)
    expectRefused(second, 'invite')
  })
})

describe('OAuth sign-in: an existing account is linked only on a verified email', () => {
  it('a Microsoft sign-in whose mail matches a member gets no token and no link', async () => {
    const linkage = await org('linkage-corp')
    const admin = await member('admin@linkage-corp.test', linkage._id, { role: 'admin' })
    // A Microsoft account in a tenant someone else administers: `mail` is whatever that admin set.
    says.microsoft = {
      id: 'ms-other-tenant',
      mail: 'admin@linkage-corp.test',
      userPrincipalName: 'someone@other-tenant.onmicrosoft.com',
      displayName: 'Some One',
    }
    const handoffsBefore = await handoffCount()

    const res = await finish(await startFlow('org_slug=linkage-corp', 'microsoft'))

    expect((await User.findById(admin._id))?.oauthProviders ?? []).toHaveLength(0)
    expectRefused(res, 'no_access')
    expect(await handoffCount()).toBe(handoffsBefore)
  })

  it('refuses a Google account whose email Google did not verify', async () => {
    const linkage = await Org.findOne({ slug: 'linkage-corp' })
    google('g-unverified', 'admin@linkage-corp.test', false)

    const res = await finish(await startFlow('org_slug=linkage-corp'))

    expect((await User.findOne({ email: 'admin@linkage-corp.test', orgId: linkage!._id }))?.oauthProviders ?? []).toHaveLength(0)
    expectRefused(res, 'no_access')
  })

  it('links a Google account whose email Google verified, and signs it in', async () => {
    const verified = await org('verified-corp')
    await member('admin@verified-corp.test', verified._id, { role: 'admin' })
    google('g-verified', 'admin@verified-corp.test')

    const res = await finish(await startFlow('org_slug=verified-corp'))

    expect(res.headers.get('location')).toBe(`${FRONTEND}/auth/oauth-callback`)
    expect(await redeemedEmail(res)).toBe('admin@verified-corp.test')
    const linked = await User.findOne({ email: 'admin@verified-corp.test' })
    expect(linked?.oauthProviders?.map((p) => `${p.provider}:${p.providerId}`)).toEqual(['google:g-verified'])
  })

  it('signs in an identity that is already linked, as before', async () => {
    const linkage = await Org.findOne({ slug: 'linkage-corp' })
    await member('linked@linkage-corp.test', linkage!._id, {
      oauthProviders: [{ provider: 'microsoft', providerId: 'ms-linked' }],
    })
    says.microsoft = { id: 'ms-linked', mail: 'linked@linkage-corp.test', displayName: 'Lin Ked' }

    const res = await finish(await startFlow('org_slug=linkage-corp', 'microsoft'))

    expect(res.headers.get('location')).toBe(`${FRONTEND}/auth/oauth-callback`)
    expect(await redeemedEmail(res)).toBe('linked@linkage-corp.test')
  })

  it('signs in an already-linked identity as its own account, whatever its email says now', async () => {
    says.microsoft = { id: 'ms-linked', mail: 'renamed@elsewhere.test', displayName: 'Lin Ked' }

    const res = await finish(await startFlow('org_slug=linkage-corp', 'microsoft'))

    expect(res.headers.get('location')).toBe(`${FRONTEND}/auth/oauth-callback`)
    expect(await redeemedEmail(res)).toBe('linked@linkage-corp.test')
    expect(await User.countDocuments({ email: 'renamed@elsewhere.test' })).toBe(0)
  })

  it('refuses a pinned invite to an email the provider did not verify', async () => {
    const pinned = await org('pinned-unverified-corp')
    const inv = await invite(pinned._id, { targetEmail: 'hire@pinned-unverified.test' })
    says.microsoft = { id: 'ms-pinned', mail: 'hire@pinned-unverified.test', displayName: 'Hi Re' }

    const res = await finish(await startFlow(`org_slug=pinned-unverified-corp&invite_code=${inv.code}`, 'microsoft'))

    expect(await User.countDocuments({ email: 'hire@pinned-unverified.test' })).toBe(0)
    expectRefused(res, 'invite_email')
    expect((await Invite.findById(inv._id))?.useCount).toBe(0)
  })

  it('still admits an unverified email on an invite that names no email', async () => {
    const open = await org('open-invite-corp')
    const inv = await invite(open._id)
    says.microsoft = { id: 'ms-contractor', mail: 'contractor@example.test', displayName: 'Con Tractor' }

    const res = await finish(await startFlow(`org_slug=open-invite-corp&invite_code=${inv.code}`, 'microsoft'))

    expect(res.headers.get('location')).toBe(`${FRONTEND}/auth/oauth-callback`)
    expect(await User.countDocuments({ email: 'contractor@example.test', orgId: open._id })).toBe(1)
  })
})

describe('OAuth sign-in: a deactivated member gets nothing, and membership refusals look alike', () => {
  /** Everything a refused callback sends back, to compare refusals byte for byte. */
  async function wire(res: Response) {
    return JSON.stringify({
      status: res.status,
      location: res.headers.get('location'),
      cookies: res.headers.getSetCookie().sort(),
      body: await res.text(),
    })
  }

  it('refuses a deactivated member signing in with an already-linked identity', async () => {
    const dormant = await org('dormant-corp')
    await member('gone@dormant-corp.test', dormant._id, {
      isActive: false,
      oauthProviders: [{ provider: 'google', providerId: 'g-gone' }],
    })
    google('g-gone', 'gone@dormant-corp.test')
    const handoffsBefore = await handoffCount()

    const res = await finish(await startFlow('org_slug=dormant-corp'))

    expectRefused(res, 'no_access')
    expect(await handoffCount()).toBe(handoffsBefore)
  })

  it('refuses a deactivated member matched by a verified email, and links nothing', async () => {
    const dormant = await Org.findOne({ slug: 'dormant-corp' })
    await member('paused@dormant-corp.test', dormant!._id, { isActive: false })
    google('g-paused', 'paused@dormant-corp.test')

    const res = await finish(await startFlow('org_slug=dormant-corp'))

    expectRefused(res, 'no_access')
    expect((await User.findOne({ email: 'paused@dormant-corp.test' }))?.oauthProviders ?? []).toHaveLength(0)
  })

  it('answers no invite, an unverified email and a deactivated member with byte-identical redirects', async () => {
    const same = await org('same-answer-corp')
    await member('unverified@same-answer.test', same._id)
    await member('deactivated@same-answer.test', same._id, { isActive: false })

    google('g-nobody', 'nobody@same-answer.test')
    const notInvited = await wire(await finish(await startFlow('org_slug=same-answer-corp')))
    google('g-unverified-member', 'unverified@same-answer.test', false)
    const unverified = await wire(await finish(await startFlow('org_slug=same-answer-corp')))
    google('g-deactivated-member', 'deactivated@same-answer.test')
    const deactivated = await wire(await finish(await startFlow('org_slug=same-answer-corp')))

    expect(JSON.parse(notInvited).location).toBe(`${FRONTEND}/auth/login?error=no_access`)
    expect(unverified).toBe(notInvited)
    expect(deactivated).toBe(notInvited)
  })

  it('issues the session only at the redeem, which re-reads the account', async () => {
    const window = await org('redeem-window-corp')
    const account = await member('brief@redeem-window.test', window._id)
    google('g-brief', 'brief@redeem-window.test')

    const cb = await finish(await startFlow('org_slug=redeem-window-corp'))
    expect(cb.headers.get('location')).toBe(`${FRONTEND}/auth/oauth-callback`)
    expect(cookieFrom(cb, 'auth')).toBe('')

    // Deactivated after the callback, before the SPA redeems.
    await User.updateOne({ _id: account._id }, { $set: { isActive: false } })
    const redeem = await call('POST', '/api/auth/oauth-code/redeem', { cookie: cookieFrom(cb, 'oauth_handoff') })

    expect(redeem.status).toBe(400)
    expect(((await redeem.json()) as any).token).toBeUndefined()
    expect(cookieFrom(redeem, 'auth')).toBe('')
  })
})

describe('What each provider’s email is worth', () => {
  it('Google: verified only when Google says `verified_email: true`', async () => {
    google('g-1', 'a@example.test', true)
    expect((await fetchUserInfo('google', 't')).emailVerified).toBe(true)
    google('g-1', 'a@example.test', false)
    expect((await fetchUserInfo('google', 't')).emailVerified).toBe(false)
  })

  it('Microsoft: never, not even when `mail` equals the user principal name', async () => {
    says.microsoft = { id: 'ms-1', mail: 'a@example.test', userPrincipalName: 'a@example.test', displayName: 'A' }
    expect((await fetchUserInfo('microsoft', 't')).emailVerified).toBe(false)
  })

  it('GitHub: only an address GitHub lists as verified, including the public profile email', async () => {
    says.github = { id: 1, login: 'octo', email: 'public@example.test' }
    says.githubEmails = [{ email: 'public@example.test', verified: false, primary: false }]
    expect((await fetchUserInfo('github', 't')).emailVerified).toBe(false)

    says.githubEmails = [{ email: 'public@example.test', verified: true, primary: false }]
    expect((await fetchUserInfo('github', 't')).emailVerified).toBe(true)

    says.github = { id: 1, login: 'octo', email: null }
    says.githubEmails = [{ email: 'primary@example.test', verified: true, primary: true }]
    const primary = await fetchUserInfo('github', 't')
    expect(primary.email).toBe('primary@example.test')
    expect(primary.emailVerified).toBe(true)
  })

  it('LinkedIn: verified only when the OpenID claim says `email_verified: true`', async () => {
    says.linkedin = { sub: 'li-1', email: 'a@example.test', name: 'A', email_verified: true }
    expect((await fetchUserInfo('linkedin', 't')).emailVerified).toBe(true)
    says.linkedin = { sub: 'li-1', email: 'a@example.test', name: 'A' }
    expect((await fetchUserInfo('linkedin', 't')).emailVerified).toBe(false)
  })

  it('Facebook: never, it gives no verification signal', async () => {
    says.facebook = { id: 'fb-1', email: 'a@example.test', name: 'A' }
    expect((await fetchUserInfo('facebook', 't')).emailVerified).toBe(false)
  })
})

describe('OAuth state: bound to the browser that started the flow', () => {
  it('sets an httpOnly, SameSite=Lax cookie scoped to the callback when the flow starts', async () => {
    const res = await call('GET', '/api/oauth/google?org_slug=state-corp')
    const set = res.headers.getSetCookie().find((c) => c.startsWith('oauth_state=')) || ''
    expect(set).toMatch(/^oauth_state=[A-Za-z0-9_-]{32,};/)
    expect(set).toMatch(/HttpOnly/i)
    expect(set).toMatch(/SameSite=Lax/i)
    expect(set).toMatch(/Path=\/api\/oauth\/callback(;|$)/i)

    // The value in the cookie is the one that travels to the provider.
    const state = new URL(res.headers.get('location') || '').searchParams.get('state') || ''
    const nonce = set.split(';')[0].split('=')[1]
    expect(JSON.parse(Buffer.from(state, 'base64url').toString()).nonce).toBe(nonce)
  })

  it('keeps an invite code out of the state that goes to the provider', async () => {
    const res = await call('GET', '/api/oauth/google?org_slug=state-corp&invite_code=bearer-invite-123')
    const state = new URL(res.headers.get('location') || '').searchParams.get('state') || ''
    expect(Buffer.from(state, 'base64url').toString()).not.toContain('bearer-invite-123')
    const set = res.headers.getSetCookie().find((c) => c.startsWith('oauth_invite=')) || ''
    expect(set).toMatch(/^oauth_invite=bearer-invite-123;/)
    expect(set).toMatch(/HttpOnly/i)
    expect(set).toMatch(/Path=\/api\/oauth\/callback(;|$)/i)
  })

  it('refuses a callback this browser did not start, and creates nothing', async () => {
    const stateCorp = await org('state-corp')
    await member('owner@state-corp.test', stateCorp._id)
    google('g-state-owner', 'owner@state-corp.test')
    const flow = await startFlow('org_slug=state-corp')
    const handoffsBefore = await handoffCount()

    const res = await finish({ ...flow, cookie: '' })

    expectRefused(res, 'state')
    expect(await handoffCount()).toBe(handoffsBefore)
  })

  it('refuses a callback carrying the state of another browser’s flow', async () => {
    google('g-state-owner', 'owner@state-corp.test')
    const theirs = await startFlow('org_slug=state-corp')
    const mine = await startFlow('org_slug=state-corp')

    const res = await finish({ ...theirs, cookie: mine.cookie })

    expectRefused(res, 'state')
  })

  it('refuses a state whose nonce was rewritten on the way back', async () => {
    google('g-state-owner', 'owner@state-corp.test')
    const flow = await startFlow('org_slug=state-corp')
    const forged = Buffer.from(JSON.stringify({ orgSlug: 'state-corp', mode: 'login', nonce: 'x'.repeat(43) })).toString(
      'base64url',
    )

    const res = await finish({ ...flow, state: forged })

    expectRefused(res, 'state')
  })

  it('checks the state in register mode too', async () => {
    google('g-reg-state', 'reg.state@example.test')
    const flow = await startFlow('mode=register')

    const refused = await finish({ ...flow, cookie: '' })
    expectRefused(refused, 'state')
    expect(cookieFrom(refused, 'oauth_pending')).toBe('')

    const accepted = await finish(flow)
    expect(accepted.headers.get('location')).toBe(`${FRONTEND}/auth/register?oauth=1`)
  })

  it('clears the state cookie on every outcome, so a state is good for one callback', async () => {
    google('g-state-owner', 'owner@state-corp.test')
    const ok = await startFlow('org_slug=state-corp')
    const signedIn = await finish(ok)
    expect(signedIn.headers.get('location')).toBe(`${FRONTEND}/auth/oauth-callback`)
    expectCleared(signedIn, 'oauth_state', '/api/oauth/callback')
    expectCleared(signedIn, 'oauth_invite', '/api/oauth/callback')

    const mismatch = await finish({ ...(await startFlow('org_slug=state-corp')), cookie: ok.cookie })
    expectCleared(mismatch, 'oauth_state', '/api/oauth/callback')

    const noCode = await call('GET', '/api/oauth/callback/google?state=x', { cookie: ok.cookie })
    expect(noCode.status).toBe(400)
    expectCleared(noCode, 'oauth_state', '/api/oauth/callback')
  })
})

describe('Activation link', () => {
  it('carries the code in the fragment, never in the query', async () => {
    sentMail.length = 0
    const res = await call('POST', '/api/auth/register', {
      body: {
        email: 'activate@handoff.com',
        username: 'activator',
        // Generated: a literal password here reads as a leaked credential to secret scanners.
        password: randomBytes(12).toString('base64url'),
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
