export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    limits: { maxUsers: 3, maxProjects: 2, exportEnabled: false, teamReporting: false, invoicing: false },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 7,
    limits: { maxUsers: -1, maxProjects: -1, exportEnabled: true, teamReporting: true, invoicing: false },
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 14,
    limits: { maxUsers: -1, maxProjects: -1, exportEnabled: true, teamReporting: true, invoicing: true },
  },
} as const

export type PlanId = keyof typeof PLANS

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tickytack',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_me',
  },
  server: {
    host: process.env.HOST || 'localhost',
    port: Number(process.env.PORT) || 3001,
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceIds: {
      pro: process.env.STRIPE_PRICE_PRO || '',
      business: process.env.STRIPE_PRICE_BUSINESS || '',
    },
  },
  oauth: {
    baseUrl: process.env.OAUTH_BASE_URL || 'http://localhost:3001',
    frontendUrl: process.env.OAUTH_FRONTEND_URL || 'http://localhost:3000',
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    },
  },
}
