import vuetify from './vuetify'
import pinia from '../store'
import router from '../router'
import i18n from '@/locales'

export function registerPlugins(app) {
  // i18n must be registered before vuetify for the adapter to work
  app.use(i18n).use(vuetify).use(pinia).use(router)
}
