import { Elysia, t } from 'elysia'
import { createHmac, timingSafeEqual, randomUUID } from 'crypto'
import { config } from 'config/src'
import { userDao, dataDeletionRequestDao } from 'services/src/dao'
import { TimeEntry } from 'db/src/models'
import BadRequestError from '../../errors/BadRequestError'
import NotFoundError from '../../errors/NotFoundError'
import logger from 'services/src/logger/logger'

function base64UrlDecode(str: string): Buffer {
  // Replace URL-safe chars and add padding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad) base64 += '='.repeat(4 - pad)
  return Buffer.from(base64, 'base64')
}

function verifySignedRequest(signedRequest: string, appSecret: string) {
  const parts = signedRequest.split('.')
  if (parts.length !== 2) {
    throw new BadRequestError('Invalid signed_request format')
  }

  const [encodedSig, payload] = parts
  const sig = base64UrlDecode(encodedSig)
  const data = JSON.parse(base64UrlDecode(payload).toString('utf-8'))

  if (!data.algorithm || data.algorithm.toUpperCase() !== 'HMAC-SHA256') {
    throw new BadRequestError('Unsupported signed_request algorithm')
  }

  const expectedSig = createHmac('sha256', appSecret).update(payload).digest()

  if (sig.length !== expectedSig.length || !timingSafeEqual(sig, expectedSig)) {
    throw new BadRequestError('Invalid signed_request signature')
  }

  return data
}

export const facebookController = new Elysia({ prefix: '/facebook' })
  .post(
    '/data-deletion',
    async ({ body }) => {
      const appSecret = config.oauth.facebook.clientSecret
      if (!appSecret) {
        throw new BadRequestError('Facebook app secret not configured')
      }

      const data = verifySignedRequest(body.signed_request, appSecret)
      const facebookUserId: string = data.user_id

      if (!facebookUserId) {
        throw new BadRequestError('No user_id in signed_request')
      }

      const confirmationCode = randomUUID()
      const user = await userDao.findByOAuthProviderId('facebook', facebookUserId)

      if (user) {
        // Delete user's time entries and then the user
        await TimeEntry.deleteMany({ userId: user._id })
        await userDao.delete(user._id as string)

        await dataDeletionRequestDao.create({
          confirmationCode,
          facebookUserId,
          userId: user._id,
          status: 'completed',
          completedAt: new Date(),
        } as any)

        logger.info(`Facebook data deletion completed for user ${user.email} (FB ID: ${facebookUserId})`)
      } else {
        await dataDeletionRequestDao.create({
          confirmationCode,
          facebookUserId,
          status: 'user_not_found',
        } as any)

        logger.info(`Facebook data deletion requested but no user found for FB ID: ${facebookUserId}`)
      }

      return {
        url: `https://tickytack.app/deletion-status?id=${confirmationCode}`,
        confirmation_code: confirmationCode,
      }
    },
    {
      body: t.Object({
        signed_request: t.String(),
      }),
    },
  )
  .get('/data-deletion/status/:code', async ({ params: { code } }) => {
    const request = await dataDeletionRequestDao.findByConfirmationCode(code)
    if (!request) {
      throw new NotFoundError('No deletion request found with this confirmation code')
    }
    return {
      confirmationCode: request.confirmationCode,
      status: request.status,
      createdAt: request.createdAt,
      completedAt: request.completedAt || null,
    }
  })
