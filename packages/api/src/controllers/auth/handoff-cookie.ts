/**
 * The cookies of an OAuth flow: the `state` nonce that binds the callback to the browser that
 * started it, and the two that carry a handoff code from the callback to the SPA's next request.
 * See `db/src/models/oauth-handoff.model.ts` for why the code is not in the redirect URL.
 *
 * All are httpOnly (script never sees them), `sameSite: 'lax'` (they are set or read on requests
 * that arrive as top-level navigations, which `'strict'` would withhold) and Secure in
 * production. Renaming any of them breaks every flow already in flight.
 */

/**
 * The sign-in code. ⚠ `path: '/api/auth'`: sent ONLY to `POST /api/auth/oauth-code/redeem`,
 * which is why that endpoint lives under `/auth` and not beside the OAuth routes.
 */
export const HANDOFF_COOKIE = 'oauth_handoff'
export const handoffCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 120,
}

/**
 * The pending-registration code, read by `GET /api/oauth/pending` (the form's prefill) and
 * `POST /api/oauth/register-oauth`. Fifteen minutes: the person is filling in a form.
 */
export const PENDING_COOKIE = 'oauth_pending'
export const pendingCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/oauth',
  maxAge: 15 * 60,
}

/**
 * The OAuth `state` nonce, set when a flow starts and compared with the state the provider hands
 * back. ⚠ `sameSite: 'lax'`, and it cannot be `'strict'`: the callback arrives as a top-level
 * navigation from the provider's site, and a strict cookie is withheld on exactly that request.
 * Sent only to the callback; ten minutes, the time a person has to finish at the provider.
 */
export const STATE_COOKIE = 'oauth_state'
export const stateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/oauth/callback',
  maxAge: 10 * 60,
}

/**
 * The invite code a flow was started with, if any, kept beside the state nonce with the same
 * options. It stays in this browser rather than riding in the `state` through the provider: an
 * invite that names no email is a bearer secret.
 */
export const INVITE_COOKIE = 'oauth_invite'

/**
 * The attributes that delete a handoff cookie. ⚠ Not Elysia's `cookie.remove()`: that deletes at
 * `Path=/`, which is a different cookie from one set at `/api/auth` or `/api/oauth`, so the code
 * would stay in the browser. A deletion must name the cookie's own path.
 */
export const clearedCookie = <T extends { path: string }>(options: T) => ({
  ...options,
  value: '',
  maxAge: 0,
  expires: new Date(0),
})

/** The session cookie, as `POST /auth/login` sets it. */
export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 86400,
  path: '/',
}
