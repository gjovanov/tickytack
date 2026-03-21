import { Elysia } from 'elysia'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key)
    }
  }
}, 5 * 60 * 1000)

function getStore(name: string): Map<string, RateLimitEntry> {
  let store = stores.get(name)
  if (!store) {
    store = new Map()
    stores.set(name, store)
  }
  return store
}

function getClientKey(request: Request, user: { id: string } | null): string {
  if (user) return `user:${user.id}`
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  return `ip:${ip}`
}

export function rateLimit(opts: {
  name: string
  max: number
  windowMs: number
}) {
  const store = getStore(opts.name)

  return new Elysia({ name: `rate-limit-${opts.name}` }).onBeforeHandle(
    ({ request, user, set }) => {
      const key = getClientKey(request, user as { id: string } | null)
      const now = Date.now()
      let entry = store.get(key)

      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + opts.windowMs }
        store.set(key, entry)
      }

      entry.count++

      set.headers['X-RateLimit-Limit'] = String(opts.max)
      set.headers['X-RateLimit-Remaining'] = String(Math.max(0, opts.max - entry.count))
      set.headers['X-RateLimit-Reset'] = String(Math.ceil(entry.resetAt / 1000))

      if (entry.count > opts.max) {
        set.status = 429
        set.headers['Retry-After'] = String(Math.ceil((entry.resetAt - now) / 1000))
        return { message: 'Too many requests. Please try again later.' }
      }
    },
  )
}
