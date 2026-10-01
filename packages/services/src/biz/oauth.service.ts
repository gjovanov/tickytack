import { config } from 'config/src'
import { User } from 'db/src/models/user.model'
import { Org } from 'db/src/models/org.model'
import { inviteDao } from '../dao/invite.dao'

export interface OAuthUserInfo {
  provider: string
  providerId: string
  email: string
  /**
   * Whether the PROVIDER verified `email`. Only a verified email may be matched to an existing
   * account; an unverified one is only what someone typed in.
   */
  emailVerified: boolean
  name: string
  avatarUrl?: string
}

/**
 * Why a sign-in was refused, as the login page shows it. The invite codes need the invite code to
 * reach; nothing about who is a member of what gets a code of its own.
 */
export type OAuthRefusalCode = 'no_access' | 'invite' | 'invite_email'

/**
 * A sign-in refused on purpose, as opposed to one that failed. `code` is what the browser is told;
 * `reason` is the specific cause, for the server log only.
 */
export class OAuthRefusal extends Error {
  readonly reason: string

  constructor(
    readonly code: OAuthRefusalCode,
    message: string,
    reason?: string,
  ) {
    super(message)
    this.reason = reason ?? message
  }
}

/**
 * ⚠ ONE answer, word for word, for: no such org; not a member and no invite; a member whose email
 * the provider did not verify; a deactivated member. Anything that differed between them would
 * tell whoever holds an identity which emails belong to which organizations.
 */
export const OAUTH_NO_ACCESS =
  "This sign-in can't be used for that organization. If you already have an account there, sign in with your password or with the provider you used before; otherwise ask an administrator for an invitation."

const noAccess = (reason: string) => new OAuthRefusal('no_access', OAUTH_NO_ACCESS, reason)

export interface UserTokenized {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  role: string
  orgId: string
}

interface TokenResponse {
  access_token: string
}

const PROVIDERS: Record<
  string,
  {
    authUrl: (clientId: string, redirectUri: string, state: string) => string
    tokenUrl: string
    tokenParams: (clientId: string, clientSecret: string, code: string, redirectUri: string) => Record<string, string>
    tokenMethod: 'POST' | 'GET'
    userInfoFetcher: (accessToken: string) => Promise<OAuthUserInfo>
  }
> = {
  google: {
    authUrl: (clientId, redirectUri, state) =>
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email+profile&state=${encodeURIComponent(state)}&access_type=offline`,
    tokenUrl: 'https://oauth2.googleapis.com/token',
    tokenParams: (clientId, clientSecret, code, redirectUri) => ({
      code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
    tokenMethod: 'POST',
    userInfoFetcher: async (accessToken) => {
      const resp = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await resp.json() as any
      return {
        provider: 'google', providerId: data.id,
        email: data.email || '',
        emailVerified: data.verified_email === true,
        name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
        avatarUrl: data.picture,
      }
    },
  },
  facebook: {
    authUrl: (clientId, redirectUri, state) =>
      `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email&state=${encodeURIComponent(state)}`,
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    tokenParams: (clientId, clientSecret, code, redirectUri) => ({
      code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri,
    }),
    tokenMethod: 'GET',
    userInfoFetcher: async (accessToken) => {
      const resp = await fetch(`https://graph.facebook.com/v18.0/me?fields=email,name,picture.type(large)&access_token=${accessToken}`)
      const data = await resp.json() as any
      return {
        provider: 'facebook', providerId: data.id,
        // Facebook gives no signal that it verified the address.
        email: data.email || '', emailVerified: false, name: data.name || '',
        avatarUrl: data.picture?.data?.url,
      }
    },
  },
  github: {
    authUrl: (clientId, redirectUri, state) =>
      `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user+user:email&state=${encodeURIComponent(state)}`,
    tokenUrl: 'https://github.com/login/oauth/access_token',
    tokenParams: (clientId, clientSecret, code, redirectUri) => ({
      code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri,
    }),
    tokenMethod: 'POST',
    userInfoFetcher: async (accessToken) => {
      const resp = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'tickytack' },
      })
      const data = await resp.json() as any
      // The profile's public email is whatever the user typed there. Only the address list says
      // which addresses GitHub verified, so the email is checked against it even when public.
      const emailResp = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'tickytack' },
      })
      const listed = await emailResp.json() as any
      const emails: any[] = Array.isArray(listed) ? listed : []
      const email: string = data.email || emails.find((e: any) => e.primary && e.verified)?.email || ''
      const emailVerified = !!email && emails.some(
        (e: any) => e.verified === true && typeof e.email === 'string' && e.email.toLowerCase() === email.toLowerCase(),
      )
      return {
        provider: 'github', providerId: String(data.id),
        email, emailVerified, name: data.login, avatarUrl: data.avatar_url,
      }
    },
  },
  linkedin: {
    authUrl: (clientId, redirectUri, state) =>
      `https://www.linkedin.com/oauth/v2/authorization?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+profile+email&state=${encodeURIComponent(state)}`,
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    tokenParams: (clientId, clientSecret, code, redirectUri) => ({
      code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
    tokenMethod: 'POST',
    userInfoFetcher: async (accessToken) => {
      const resp = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await resp.json() as any
      return {
        provider: 'linkedin', providerId: data.sub || '',
        email: data.email || '',
        emailVerified: data.email_verified === true,
        name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
        avatarUrl: data.picture,
      }
    },
  },
  microsoft: {
    authUrl: (clientId, redirectUri, state) =>
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+profile+email+User.Read&state=${encodeURIComponent(state)}`,
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    tokenParams: (clientId, clientSecret, code, redirectUri) => ({
      code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
    tokenMethod: 'POST',
    userInfoFetcher: async (accessToken) => {
      const resp = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await resp.json() as any
      return {
        provider: 'microsoft', providerId: data.id,
        email: data.mail || data.userPrincipalName || '',
        // ⚠ Never verified. `mail` is set by the administrator of the account's own directory,
        // and this app accepts accounts from any directory, so it proves nothing about who
        // receives that mail. The user principal name is no better.
        emailVerified: false,
        name: data.displayName || data.givenName || '',
        avatarUrl: undefined,
      }
    },
  },
}

const ENV_MAP: Record<string, { id: string; secret: string }> = {
  google: { id: 'GOOGLE_OAUTH_CLIENT_ID', secret: 'GOOGLE_OAUTH_CLIENT_SECRET' },
  facebook: { id: 'FACEBOOK_CLIENT_ID', secret: 'FACEBOOK_CLIENT_SECRET' },
  github: { id: 'GITHUB_CLIENT_ID', secret: 'GITHUB_CLIENT_SECRET' },
  linkedin: { id: 'LINKEDIN_CLIENT_ID', secret: 'LINKEDIN_CLIENT_SECRET' },
  microsoft: { id: 'MICROSOFT_CLIENT_ID', secret: 'MICROSOFT_CLIENT_SECRET' },
}

function getProviderConfig(provider: string) {
  // Read from config first, fallback to env vars directly (env may be set after config init)
  const p = (config.oauth as any)?.[provider]
  const envKeys = ENV_MAP[provider]
  const clientId = p?.clientId || (envKeys ? process.env[envKeys.id] : '') || ''
  const clientSecret = p?.clientSecret || (envKeys ? process.env[envKeys.secret] : '') || ''
  if (!clientId) throw new Error(`OAuth provider "${provider}" is not configured`)
  return { clientId, clientSecret }
}

function callbackUrl(provider: string): string {
  return `${config.oauth.baseUrl}/api/oauth/callback/${provider}`
}

/**
 * The provider's authorization URL. ⚠ The caller mints `nonce` and keeps a copy in a cookie on
 * the same response: the callback accepts only a state whose nonce matches that cookie, which is
 * what makes the state evidence of which browser started the flow.
 */
export function buildAuthUrl(provider: string, orgSlug: string | undefined, mode: string, nonce: string): string {
  const providerDef = PROVIDERS[provider]
  if (!providerDef) throw new Error(`Unknown OAuth provider: ${provider}`)
  if (!nonce) throw new Error('buildAuthUrl requires a nonce')
  const { clientId } = getProviderConfig(provider)
  const state = JSON.stringify({ orgSlug, mode, nonce })
  const stateEncoded = Buffer.from(state).toString('base64url')
  return providerDef.authUrl(clientId, callbackUrl(provider), stateEncoded)
}

export async function exchangeCodeForToken(provider: string, code: string): Promise<string> {
  const providerDef = PROVIDERS[provider]
  if (!providerDef) throw new Error(`Unknown OAuth provider: ${provider}`)
  const { clientId, clientSecret } = getProviderConfig(provider)
  const params = providerDef.tokenParams(clientId, clientSecret, code, callbackUrl(provider))

  let resp: Response
  if (providerDef.tokenMethod === 'GET') {
    const qs = new URLSearchParams(params).toString()
    resp = await fetch(`${providerDef.tokenUrl}?${qs}`, {
      headers: { Accept: 'application/json' },
    })
  } else {
    resp = await fetch(providerDef.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(params).toString(),
    })
  }

  const data = await resp.json() as TokenResponse
  if (!data.access_token) throw new Error(`Failed to exchange code for token: ${JSON.stringify(data)}`)
  return data.access_token
}

export async function fetchUserInfo(provider: string, accessToken: string): Promise<OAuthUserInfo> {
  const providerDef = PROVIDERS[provider]
  if (!providerDef) throw new Error(`Unknown OAuth provider: ${provider}`)
  return providerDef.userInfoFetcher(accessToken)
}

/**
 * Sign an OAuth identity in to an EXISTING organization.
 *
 * `orgSlug` is the caller's choice, not a fact about them, and the provider vouches for an
 * identity, not for membership anywhere. So, in this order:
 *
 * 1. An identity already linked to a member of this org signs in as that member, whatever its
 *    email says now.
 * 2. Otherwise a member with the same email is linked to it, but only if the provider verified
 *    that email. An unverified address is only what someone typed in.
 * 3. Otherwise the identity is not a member, and only a valid invite for this org lets it in,
 *    with the invite's role. An invite pinned to an email needs that email verified; one that
 *    names no email is a bearer secret, as it is for a password registration.
 *
 * A deactivated member is refused at 1 and 2, as the password login refuses them. Every refusal
 * that turns on membership is the same `no_access`, word for word (see `OAUTH_NO_ACCESS`).
 */
export async function getOrCreateUser(
  info: OAuthUserInfo,
  orgSlug: string | undefined,
  inviteCode?: string,
): Promise<{ user: UserTokenized; isNew: boolean }> {
  const org = orgSlug ? await Org.findOne({ slug: String(orgSlug).toLowerCase() }) : null
  if (!org) throw noAccess('unknown_org')

  const provider = String(info.provider)
  const providerId = String(info.providerId ?? '')
  const email = typeof info.email === 'string' ? info.email : ''
  if (!providerId || !email) throw new Error('The provider did not identify the account')

  let user = await User.findOne({ orgId: org._id, oauthProviders: { $elemMatch: { provider, providerId } } })
  let isNew = false

  if (user) {
    if (!user.isActive) throw noAccess('deactivated')
  } else {
    user = await User.findOne({ email, orgId: org._id })
    if (user) {
      if (!user.isActive) throw noAccess('deactivated')
      if (info.emailVerified !== true) throw noAccess('unverified_email')
      user.oauthProviders = user.oauthProviders || []
      user.oauthProviders.push({ provider, providerId })
      await user.save()
    } else {
      if (!inviteCode) throw noAccess('no_invite')
      const invite = await inviteDao.findByCode(String(inviteCode))
      if (!invite) throw new OAuthRefusal('invite', 'Invalid invite code')
      const validation = inviteDao.validate(invite)
      if (!validation.valid) throw new OAuthRefusal('invite', validation.reason || 'Invite is not valid')
      // ⚠ The invite decides the org, not the URL: a valid invite for one org is no key to another.
      if (String(invite.orgId) !== String(org._id)) {
        throw new OAuthRefusal('invite', 'This invite is for a different organization')
      }
      if (
        invite.targetEmail &&
        (info.emailVerified !== true || invite.targetEmail.toLowerCase() !== email.toLowerCase())
      ) {
        throw new OAuthRefusal('invite_email', 'This invite is for a different email address')
      }

      // Claim the use BEFORE creating the account: the claim is the atomic check that this use is
      // still available, so two callbacks cannot both spend the last use of one invite.
      const claimed = await inviteDao.incrementUseCount(String(invite._id))
      if (!claimed) throw new OAuthRefusal('invite', 'Invite could not be used')

      const nameParts = info.name.split(' ')
      const firstName = nameParts[0] || info.name
      const lastName = nameParts.slice(1).join(' ') || info.name
      const username = `${info.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${Date.now().toString(36).slice(-4)}`

      user = await User.create({
        email,
        username,
        firstName,
        lastName,
        role: invite.assignRole || 'member',
        orgId: org._id,
        isActive: true,
        oauthProviders: [{ provider, providerId }],
      })
      isNew = true
    }
  }

  const tokenized: UserTokenized = {
    id: String(user._id),
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    orgId: String(org._id),
  }

  return { user: tokenized, isNew }
}

export async function registerWithOAuth(
  info: OAuthUserInfo,
  orgName: string,
  orgSlug: string,
  username: string,
): Promise<{ user: UserTokenized; isNew: boolean }> {
  const existingOrg = await Org.findOne({ slug: orgSlug.toLowerCase() })
  if (existingOrg) throw new Error(`Organization slug "${orgSlug}" is already taken`)

  const nameParts = info.name.split(' ')
  const firstName = nameParts[0] || info.name
  const lastName = nameParts.slice(1).join(' ') || info.name

  const org = await Org.create({
    name: orgName,
    slug: orgSlug.toLowerCase(),
    settings: { weekStartsOn: 1, workingHoursPerDay: 8 },
  })

  const user = await User.create({
    email: info.email,
    username,
    firstName,
    lastName,
    role: 'admin',
    orgId: org._id,
    isActive: true,
    oauthProviders: [
      { provider: info.provider, providerId: info.providerId },
    ],
  })

  await Org.findByIdAndUpdate(org._id, { ownerId: user._id })

  const tokenized: UserTokenized = {
    id: String(user._id),
    email: user.email,
    username,
    firstName,
    lastName,
    role: user.role,
    orgId: String(org._id),
  }

  return { user: tokenized, isNew: true }
}

/**
 * Decode the `state` the provider handed back. ⚠ Its content made a round trip through the
 * browser and is untrusted until the caller has matched `nonce` against its cookie. Fields are
 * read one by one and only as strings, so a crafted state cannot add keys or smuggle objects.
 */
export function parseState(stateStr: string): { orgSlug?: string; mode?: string; nonce?: string } {
  try {
    const raw = JSON.parse(Buffer.from(stateStr, 'base64url').toString('utf8'))
    if (!raw || typeof raw !== 'object') throw new Error('not an object')
    const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
    return { orgSlug: str(raw.orgSlug), mode: str(raw.mode), nonce: str(raw.nonce) }
  } catch {
    throw new Error('Invalid OAuth state parameter')
  }
}
