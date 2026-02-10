import { defineStore } from 'pinia'
import httpClient from '@/services/http-client'
import {
  getInitialLocale,
  saveLocale,
  SUPPORTED_LOCALES,
} from '@/locales'
import i18n from '@/locales'

interface AuthUser {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  role: string
  orgId: string
}

interface OrgInfo {
  id: string
  name: string
  slug: string
}

interface AppState {
  theme: string
  locale: string
  leftDrawer: boolean
  auth: {
    user: AuthUser | null
    token: string | null
  }
  currentOrg: OrgInfo | null
  orgs: OrgInfo[]
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    theme: 'light',
    locale: getInitialLocale(),
    leftDrawer: true,
    auth: {
      user: null,
      token: localStorage.getItem('ttt_token'),
    },
    currentOrg: null,
    orgs: [],
  }),
  actions: {
    async login(username: string, password: string, orgSlug: string) {
      const { data } = await httpClient.post('/auth/login', {
        username,
        password,
        orgSlug,
      })
      this.auth.user = data.user
      this.auth.token = data.token
      this.currentOrg = data.org
      localStorage.setItem('ttt_token', data.token)
      localStorage.setItem('ttt_user', JSON.stringify(data.user))
      return data
    },
    async register(payload: {
      email: string
      username: string
      password: string
      firstName: string
      lastName: string
      orgName: string
      orgSlug: string
    }) {
      const { data } = await httpClient.post('/auth/register', payload)
      this.auth.user = data.user
      this.auth.token = data.token
      this.currentOrg = data.org
      localStorage.setItem('ttt_token', data.token)
      localStorage.setItem('ttt_user', JSON.stringify(data.user))
      return data
    },
    async registerOAuth(payload: {
      oauthToken: string
      orgName: string
      orgSlug: string
      username: string
    }) {
      const { data } = await httpClient.post('/oauth/register-oauth', payload)
      this.auth.user = data.user
      this.auth.token = data.token
      this.currentOrg = data.org
      localStorage.setItem('ttt_token', data.token)
      localStorage.setItem('ttt_user', JSON.stringify(data.user))
      return data
    },
    async fetchMe() {
      try {
        const { data } = await httpClient.get('/auth/me')
        this.auth.user = data.user
        this.currentOrg = data.org
        return data
      } catch {
        this.logout()
        return null
      }
    },
    logout() {
      this.auth.user = null
      this.auth.token = null
      this.currentOrg = null
      localStorage.removeItem('ttt_token')
      localStorage.removeItem('ttt_user')
      httpClient.post('/auth/logout').catch(() => {})
    },
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
    },
    setLocale(locale: string) {
      if (SUPPORTED_LOCALES.includes(locale as 'en' | 'de')) {
        this.locale = locale
        i18n.global.locale.value = locale as 'en' | 'de'
        saveLocale(locale as 'en' | 'de')
      }
    },
    toggleLocale() {
      const newLocale = this.locale === 'de' ? 'en' : 'de'
      this.setLocale(newLocale)
    },
    toggleLeftDrawer() {
      this.leftDrawer = !this.leftDrawer
    },
  },
  getters: {
    isAuth: (state) => state.auth.user !== null,
    isDark: (state) => state.theme === 'dark',
    isGerman: (state) => state.locale === 'de',
    isEnglish: (state) => state.locale === 'en',
    initials: (state) => {
      if (!state.auth.user) return ''
      return `${state.auth.user.firstName[0]}${state.auth.user.lastName[0]}`.toUpperCase()
    },
    fullName: (state) => {
      if (!state.auth.user) return ''
      return `${state.auth.user.firstName} ${state.auth.user.lastName}`
    },
  },
})
