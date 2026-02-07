import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'
import { useI18n } from 'vue-i18n'
import i18n from '@/locales'

export default createVuetify({
  locale: {
    adapter: createVueI18nAdapter({ i18n, useI18n }),
  },
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          accent: '#424242',
          secondary: '#FF6F00',
          info: '#26A69A',
          warning: '#FFC107',
          error: '#FF3D00',
          success: '#00E676',
        },
      },
      dark: {
        colors: {
          background: '#222',
          primary: '#42A5F5',
          accent: '#212121',
          secondary: '#FF6F00',
          info: '#26A69A',
          warning: '#FFC107',
          error: '#DD2C00',
          success: '#00E676',
        },
      },
    },
  },
})
