import { createI18n } from 'vue-i18n'
import de from './de'
import en from './en'

export type MessageSchema = typeof en

export const SUPPORTED_LOCALES = ['en', 'de'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en'
export const FALLBACK_LOCALE: SupportedLocale = 'en'

export const LOCALE_STORAGE_KEY = 'ttt_locale'

export function getInitialLocale(): SupportedLocale {
  if (typeof window !== 'undefined') {
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (
      storedLocale &&
      SUPPORTED_LOCALES.includes(storedLocale as SupportedLocale)
    ) {
      return storedLocale as SupportedLocale
    }

    const browserLang = navigator.language?.split('-')[0]
    if (
      browserLang &&
      SUPPORTED_LOCALES.includes(browserLang as SupportedLocale)
    ) {
      return browserLang as SupportedLocale
    }
  }

  return DEFAULT_LOCALE
}

export function saveLocale(locale: SupportedLocale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }
}

const i18n = createI18n<[MessageSchema], SupportedLocale>({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: FALLBACK_LOCALE,
  messages: {
    en,
    de,
  },
  missing: (locale, key) => {
    if (import.meta.env.DEV) {
      console.warn(
        `[i18n] Missing translation: "${key}" for locale "${locale}"`,
      )
    }
    return key
  },
  fallbackWarn: import.meta.env.DEV,
  missingWarn: import.meta.env.DEV,
})

export default i18n

export const { t, te, tm, rt, d, n } = i18n.global
