import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const isPublic = to.matched.some((record) => record.meta.public)
  const token = localStorage.getItem('ttt_token')

  if (!isPublic && !token) {
    next({ name: 'auth.login' })
  } else {
    next()
  }
})

export default router
