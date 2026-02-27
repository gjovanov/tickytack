import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { resolve } from 'path'
import swagger from '@elysiajs/swagger'

import { connectDB } from 'db/src/connection'
import logger from 'services/src/logger/logger'

import BadRequestError from './errors/BadRequestError'
import NotFoundError from './errors/NotFoundError'
import UnauthorizedError from './errors/UnauthorizedError'

import { healthController } from './controllers/health/health.controller'
import { authController } from './controllers/auth/auth.controller'
import { oauthController } from './controllers/auth/oauth.controller'
import { orgController } from './controllers/org/org.controller'
import { userController } from './controllers/user/user.controller'
import { projectController } from './controllers/project/project.controller'
import { ticketController } from './controllers/ticket/ticket.controller'
import { ticketSearchController } from './controllers/ticket/ticket-search.controller'
import { timeentryController } from './controllers/timeentry/timeentry.controller'
import { exportController } from './controllers/export/export.controller'
import { inviteController } from './controllers/invite/invite.controller'
import { stripeController } from './controllers/stripe/stripe.controller'

import type { UserTokenized } from './types'

const port = process.env.PORT ?? 3001
const hostname = process.env.HOST || 'localhost'

// SPA paths that should serve index.html
const spaPaths = [
  '/',
  '/landing',
  '/auth/login',
  '/auth/register',
  '/auth/oauth-callback',
  '/invite/:code',
  '/timesheet',
  '/admin',
  '/admin/orgs',
  '/admin/projects',
  '/admin/tickets',
  '/admin/users',
  '/admin/invites',
  '/admin/billing',
  '/export',
  '/privacy',
  '/terms',
]

// Connect to MongoDB
await connectDB()
logger.info('Connected to MongoDB')

const AuthService = new Elysia({ name: 'Service.Auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET as string,
    }),
  )
  .derive({ as: 'scoped' }, async ({ cookie, headers, jwt }) => {
    const { auth } = cookie
    const { authorization } = headers
    const token = auth?.value ?? authorization
    const user = (await jwt.verify(token)) as UserTokenized | false
    return {
      user: user || null,
    }
  })
  .macro(({ onBeforeHandle }) => ({
    isSignIn() {
      onBeforeHandle(({ user, error }) => {
        if (!user) return error(401)
      })
    },
  }))

const app: Elysia = new Elysia({ serve: { reusePort: true }, aot: true })
  .error({
    BadRequestError,
    NotFoundError,
    UnauthorizedError,
  })
  .onError(({ code, error, set, request }) => {
    const customCode: string = code
    let status = 500
    let message: string

    switch (customCode) {
      case 'VALIDATION':
      case 'BadRequestError': {
        status = 400
        message = error.message
        break
      }
      case 'UnauthorizedError': {
        status = 401
        message = error.message
        break
      }
      case 'NOT_FOUND': {
        // Static plugin 404s are expected (dev mode, missing assets) — don't log
        status = 404
        message = 'NOT_FOUND'
        break
      }
      case 'NotFoundError': {
        status = 404
        message = error.message
        break
      }
      default: {
        logger.error(error, `Unhandled error: ${request.method} ${request.url}`)
        status = 500
        message = error.message
        break
      }
    }
    set.status = status
    return { message, status }
  })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET as string,
    }),
  )
  .use(AuthService)
  .use(
    cors({
      exposeHeaders: ['Content-Disposition'],
    }),
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: 'TickyTack API',
          version: '1.0.0',
          description: 'Time tracking API',
        },
      },
    }),
  )
  .group('/api', (app) =>
    app
      .use(healthController)
      .use(authController)
      .use(oauthController)
      .use(orgController)
      .use(userController)
      .use(projectController)
      .use(ticketController)
      .use(ticketSearchController)
      .use(timeentryController)
      .use(exportController)
      .use(inviteController)
      .use(stripeController),
  )
  .use(
    staticPlugin({
      assets: resolve('../ui/dist'),
      prefix: '',
    }),
  )

// SPA route fallback
for (const path of spaPaths) {
  app.get(path, () => Bun.file('../ui/dist/index.html'))
}

// Use custom Bun.serve to normalize trailing slashes before Elysia routing
app.compile()
const server = Bun.serve({
  port,
  hostname,
  idleTimeout: 255,
  fetch(request) {
    const url = new URL(request.url)
    if (!url.pathname.endsWith('/') && !url.pathname.includes('.')) {
      url.pathname += '/'
      return app.fetch(new Request(url, request))
    }
    return app.fetch(request)
  },
})

logger.info(
  `🦊 TickyTack API is running at http://${server.hostname}:${server.port}`,
)

export { app }
export type App = typeof app
