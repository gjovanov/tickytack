import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const isPublic = to.matched.some((record) => record.meta.public)
  const isGuest = to.matched.some((record) => record.meta.guest)
  const token = localStorage.getItem('ttt_token')

  if (!isPublic && !token) {
    // Unauthenticated users go to landing page
    next({ name: 'landing' })
  } else if (isGuest && token) {
    // Authenticated users on guest pages (landing) go to home
    const pendingInvite = sessionStorage.getItem('pending_invite_code')
    if (pendingInvite) {
      sessionStorage.removeItem('pending_invite_code')
      next({ name: 'invite', params: { code: pendingInvite } })
    } else {
      next({ name: 'home' })
    }
  } else {
    next()
  }
})

export default router
