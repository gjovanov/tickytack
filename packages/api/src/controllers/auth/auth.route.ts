import { t } from 'elysia'

export const authRegister = {
  path: '/register',
  schema: {
    body: t.Object({
      email: t.String({ format: 'email' }),
      username: t.String({ minLength: 3 }),
      password: t.String({ minLength: 6 }),
      firstName: t.String({ minLength: 1 }),
      lastName: t.String({ minLength: 1 }),
      orgName: t.Optional(t.String({ minLength: 1 })),
      orgSlug: t.Optional(t.String({ minLength: 1 })),
      inviteCode: t.Optional(t.String()),
    }),
  },
}

export const authLogin = {
  path: '/login',
  schema: {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      orgSlug: t.String(),
    }),
  },
}

export const authMe = {
  path: '/me',
  schema: {},
}

export const authLogout = {
  path: '/logout',
  schema: {},
}
