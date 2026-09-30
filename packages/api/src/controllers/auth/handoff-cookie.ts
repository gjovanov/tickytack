/**
 * The two cookies that carry an OAuth handoff code from the callback to the SPA's next request.
 * See `db/src/models/oauth-handoff.model.ts` for why the code is not in the redirect URL.
 *
 * Both are httpOnly (script never sees the code), `sameSite: 'lax'` (they are set on a redirect
 * that arrives as a top-level navigation and read by a same-origin request, which `'strict'`
 * would withhold) and Secure in production. Renaming either breaks every flow already in flight.
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
