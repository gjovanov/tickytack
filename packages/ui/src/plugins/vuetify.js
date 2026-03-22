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
  defaults: {
    VCard: {
      elevation: 0,
      variant: 'flat',
    },
    VBtn: {
      elevation: 0,
    },
  },
  theme: {
    themes: {
      light: {
        colors: {
          background: '#f4f0ed',
          surface: '#ffffff',
          primary: '#F57C00',
          secondary: '#5D4037',
          accent: '#00897B',
          success: '#43A047',
          warning: '#FFB300',
          error: '#E53935',
          info: '#0277BD',
        },
      },
      dark: {
        colors: {
          background: '#0e0c0b',
          surface: '#1E1A17',
          primary: '#FFB74D',
          secondary: '#8D6E63',
          accent: '#4DB6AC',
          success: '#66BB6A',
          warning: '#FFA726',
          error: '#EF5350',
          info: '#29B6F6',
        },
      },
    },
  },
})
