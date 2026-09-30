import { Schema, model, type Document, type Types } from 'mongoose'

/**
 * A one-time handoff from the OAuth callback to the SPA: no credential travels in a URL.
 *
 * The callback used to put a token in the redirect URL (`/auth/oauth-callback?token=…`, and for a
 * new account `/auth/register?oauth_token=…`). It now stores what it learned here and puts a
 * random code in an httpOnly cookie; the SPA asks the server to redeem it and reads nothing from
 * the address.
 *
 * - `kind: 'login'` holds the claims of a finished sign-in; redeemed once, within two minutes.
 * - `kind: 'register'` holds the provider identity of an account about to be created; it lives
 *   while the person fills in the registration form, and is consumed when the account exists.
 *
 * `payload` holds claims, never a signed token: the JWT is minted at redeem, with a full TTL.
 * The code is stored as a SHA-256 hash, so a dump of this collection yields nothing redeemable.
 * It is in Mongo, not in memory, because the redeem need not reach the process that served the
 * callback.
 */
export type OAuthHandoffKind = 'login' | 'register'

export interface IOAuthHandoff extends Document {
  _id: Types.ObjectId
  kind: OAuthHandoffKind
  /** SHA-256 (hex) of the code held in the browser's httpOnly cookie. */
  codeHash: string
  /** Claims (`login`) or the provider identity (`register`). Not a token. */
  payload: Record<string, unknown>
  expiresAt: Date
  /** Set when redeemed. Single use is enforced against this, not against deletion. */
  usedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const oauthHandoffSchema = new Schema<IOAuthHandoff>(
  {
    kind: { type: String, enum: ['login', 'register'], required: true },
    codeHash: { type: String, required: true, unique: true },
    payload: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

/**
 * ⚠ The TTL reaper is a floor, not the expiry check: Mongo runs it about once a minute, so a
 * document outlives `expiresAt` by up to that long. The service compares the date itself.
 */
oauthHandoffSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const OAuthHandoff = model<IOAuthHandoff>('OAuthHandoff', oauthHandoffSchema)
