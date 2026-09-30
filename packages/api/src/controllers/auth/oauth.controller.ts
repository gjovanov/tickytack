import { Elysia, t } from 'elysia'
import {
  buildAuthUrl,
  exchangeCodeForToken,
  fetchUserInfo,
  getOrCreateUser,
  registerWithOAuth,
  parseState,
} from 'services/src/biz/oauth.service'
import {
  createHandoff,
  peekHandoff,
  redeemHandoff,
  releaseHandoff,
  HandoffError,
  HANDOFF_REFUSED,
  LOGIN_HANDOFF_TTL_MS,
  REGISTER_HANDOFF_TTL_MS,
} from 'services/src/biz/oauth-handoff.service'
import { config } from 'config/src'
import {
  HANDOFF_COOKIE,
  handoffCookieOptions,
  PENDING_COOKIE,
  pendingCookieOptions,
  clearedCookie,
  authCookieOptions,
} from './handoff-cookie'

const VALID_PROVIDERS = ['google', 'facebook', 'github', 'linkedin', 'microsoft']

export const oauthController = new Elysia({ prefix: '/oauth' })
  .get('/:provider', async ({ params: { provider }, query, set }) => {
    if (!VALID_PROVIDERS.includes(provider)) {
      set.status = 400
      return { message: `Unknown provider: ${provider}` }
    }

    const orgSlug = (query as any).org_slug
    const mode = (query as any).mode || 'login'

    if (mode === 'login' && !orgSlug) {
      set.status = 400
      return { message: 'org_slug query parameter is required for login' }
    }

    try {
      const authUrl = buildAuthUrl(provider, orgSlug, mode)
      return Response.redirect(authUrl, 302)
    } catch (err: any) {
      set.status = 400
      return { message: err.message }
    }
  })
  .get('/callback/:provider', async ({ params: { provider }, query, jwt, cookie, set }) => {
    if (!VALID_PROVIDERS.includes(provider)) {
      set.status = 400
      return { message: `Unknown provider: ${provider}` }
    }

    const { code, state } = query as { code?: string; state?: string }
    if (!code || !state) {
      set.status = 400
      return { message: 'Missing code or state parameter' }
    }

    try {
      const { orgSlug, mode } = parseState(state)
      const accessToken = await exchangeCodeForToken(provider, code)
      const userInfo = await fetchUserInfo(provider, accessToken)

      if (!userInfo.email) {
        set.status = 400
        return { message: 'Could not retrieve email from OAuth provider' }
      }

      // No credential in the redirect URL, in either mode. What the callback learned goes into a
      // one-time server-side record, and its code into an httpOnly cookie that only this browser
      // holds; the SPA redeems it with a same-origin request and reads nothing from the address.
      if (mode === 'register') {
        const pendingCode = await createHandoff(
          'register',
          {
            email: userInfo.email,
            name: userInfo.name,
            provider: userInfo.provider,
            providerId: userInfo.providerId,
            avatarUrl: userInfo.avatarUrl || '',
          },
          REGISTER_HANDOFF_TTL_MS,
        )
        cookie[PENDING_COOKIE].set({ value: pendingCode, ...pendingCookieOptions })
        return Response.redirect(`${config.oauth.frontendUrl}/auth/register?oauth=1`, 302)
      }

      const { user } = await getOrCreateUser(userInfo, orgSlug)

      const token: string = await jwt.sign(user as any)
      cookie.auth.set({ value: token, ...authCookieOptions })

      const handoffCode = await createHandoff('login', { ...user }, LOGIN_HANDOFF_TTL_MS)
      cookie[HANDOFF_COOKIE].set({ value: handoffCode, ...handoffCookieOptions })

      return Response.redirect(`${config.oauth.frontendUrl}/auth/oauth-callback`, 302)
    } catch (err: any) {
      return Response.redirect(`${config.oauth.frontendUrl}/auth/login?error=${encodeURIComponent(err.message)}`, 302)
    }
  })
  // The registration form's prefill: who the provider said this browser is. Read-only; the
  // registration below consumes the record.
  .get('/pending', async ({ cookie, set }) => {
    try {
      const pending = await peekHandoff('register', cookie[PENDING_COOKIE].value)
      return { email: pending.email, name: pending.name, provider: pending.provider }
    } catch {
      set.status = 400
      return { message: HANDOFF_REFUSED }
    }
  })
  .post('/register-oauth', async ({ jwt, body, cookie, set }) => {
    // ⚠ The identity comes ONLY from this browser's pending cookie, never from the body or the URL.
    const pendingCode = cookie[PENDING_COOKIE].value
    let pending: Record<string, unknown>
    try {
      pending = await redeemHandoff('register', pendingCode)
    } catch (err) {
      cookie[PENDING_COOKIE].set(clearedCookie(pendingCookieOptions))
      set.status = 400
      return { message: err instanceof HandoffError ? err.message : HANDOFF_REFUSED }
    }

    try {
      const p = pending as any
      const { user } = await registerWithOAuth(
        { provider: p.provider, providerId: p.providerId, email: p.email, name: p.name, avatarUrl: p.avatarUrl },
        body.orgName,
        body.orgSlug,
        body.username,
      )
      cookie[PENDING_COOKIE].set(clearedCookie(pendingCookieOptions))

      const token: string = await jwt.sign(user as any)
      cookie.auth.set({ value: token, ...authCookieOptions })

      return { user, token, org: { id: user.orgId, name: body.orgName, slug: body.orgSlug } }
    } catch (err: any) {
      // The account was not created (a taken slug, say): put the pending registration back so
      // the same person can correct the form without another provider round trip.
      await releaseHandoff('register', pendingCode as string)
      set.status = 400
      return { message: err.message }
    }
  }, {
    body: t.Object({
      orgName: t.String({ minLength: 1 }),
      orgSlug: t.String({ minLength: 1 }),
      username: t.String({ minLength: 3 }),
    }),
  })
