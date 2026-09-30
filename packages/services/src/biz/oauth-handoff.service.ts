import { createHash, randomBytes } from 'crypto'
import { OAuthHandoff, type OAuthHandoffKind } from 'db/src/models/oauth-handoff.model'

/**
 * The OAuth handoff: what the callback learned goes into a one-time server-side record, and the
 * code for it into an httpOnly cookie, so nothing that works as a credential is ever in a URL.
 * See `oauth-handoff.model.ts` for why.
 */

/** A sign-in handoff is one redirect plus one POST. */
export const LOGIN_HANDOFF_TTL_MS = 120_000
/** A registration waits while the person fills in the form. */
export const REGISTER_HANDOFF_TTL_MS = 15 * 60_000

/** One message for every refusal, so the endpoints cannot be used as an oracle. */
export const HANDOFF_REFUSED = 'No sign-in is in progress. Please sign in again.'

/** Thrown for every reason a handoff cannot be used, so the caller cannot tell which. */
export class HandoffError extends Error {}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

function liveFilter(kind: OAuthHandoffKind, code: unknown) {
  if (typeof code !== 'string' || !code) throw new HandoffError(HANDOFF_REFUSED)
  return { kind, codeHash: hashCode(code), usedAt: null, expiresAt: { $gt: new Date() } }
}

/**
 * Store `payload` and return the code for the httpOnly cookie. 32 random bytes: this is a bearer
 * credential for as long as it lives, so it is sized like one.
 */
export async function createHandoff(
  kind: OAuthHandoffKind,
  payload: Record<string, unknown>,
  ttlMs: number,
): Promise<string> {
  const code = randomBytes(32).toString('base64url')
  await OAuthHandoff.create({
    kind,
    codeHash: hashCode(code),
    payload,
    expiresAt: new Date(Date.now() + ttlMs),
  })
  return code
}

/**
 * Consume a handoff and return its payload.
 *
 * ⚠ Single use is a CONDITIONAL update (`usedAt: null` in the filter), not a read followed by a
 * write: two simultaneous redeems would both pass a read-then-write check, and exactly one of
 * them may win. Unknown, expired and already-used codes all raise the same error.
 */
export async function redeemHandoff(kind: OAuthHandoffKind, code: unknown): Promise<Record<string, unknown>> {
  const row = await OAuthHandoff.findOneAndUpdate(liveFilter(kind, code), { $set: { usedAt: new Date() } }, { new: true }).exec()
  if (!row) throw new HandoffError(HANDOFF_REFUSED)
  return row.payload
}

/** Read a live handoff without consuming it (the registration form's prefill). */
export async function peekHandoff(kind: OAuthHandoffKind, code: unknown): Promise<Record<string, unknown>> {
  const row = await OAuthHandoff.findOne(liveFilter(kind, code)).exec()
  if (!row) throw new HandoffError(HANDOFF_REFUSED)
  return row.payload
}

/**
 * Put a consumed, unexpired handoff back in play. Only for a registration whose account could not
 * be created (a taken slug, say): the code stays in the one browser that holds the cookie, and
 * making that person start the provider round trip again would gain nothing.
 */
export async function releaseHandoff(kind: OAuthHandoffKind, code: string): Promise<void> {
  await OAuthHandoff.updateOne(
    { kind, codeHash: hashCode(code), usedAt: { $ne: null }, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: null } },
  ).exec()
}
