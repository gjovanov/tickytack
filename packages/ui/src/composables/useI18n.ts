import { computed } from 'vue'
import { useI18n as useVueI18n } from 'vue-i18n'
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  saveLocale,
  type SupportedLocale,
} from '@/locales'

export function useAppI18n() {
  const { t, te, tm, rt, d, n, locale } = useVueI18n()

  const currentLocale = computed<SupportedLocale>({
    get: () => locale.value as SupportedLocale,
    set: (value: SupportedLocale) => {
      locale.value = value
      saveLocale(value)
    },
  })

  const availableLocales = computed(() =>
    SUPPORTED_LOCALES.map((code) => ({
      code,
      label: t(`common.language.${code === 'de' ? 'german' : 'english'}`),
      nativeLabel: code === 'de' ? 'Deutsch' : 'English',
    })),
  )

  const isGerman = computed(() => currentLocale.value === 'de')
  const isEnglish = computed(() => currentLocale.value === 'en')

  function setLocale(newLocale: SupportedLocale) {
    if (SUPPORTED_LOCALES.includes(newLocale)) {
      currentLocale.value = newLocale
    } else {
      console.warn(
        `[i18n] Unsupported locale: ${newLocale}. Using default: ${DEFAULT_LOCALE}`,
      )
      currentLocale.value = DEFAULT_LOCALE
    }
  }

  function toggleLocale() {
    currentLocale.value = currentLocale.value === 'de' ? 'en' : 'de'
  }

  function formatNumber(
    value: number,
    options?: Intl.NumberFormatOptions,
  ): string {
    return n(value, options)
  }

  function formatCurrency(value: number, currency = 'EUR'): string {
    return n(value, { style: 'currency', currency })
  }

  function formatDate(
    value: Date | number | string,
    format: 'short' | 'medium' | 'long' = 'medium',
  ): string {
    const date = value instanceof Date ? value : new Date(value)
    return d(date, format)
  }

  function tp(
    key: string,
    count: number,
    named?: Record<string, unknown>,
  ): string {
    return t(key, { count, n: count, ...named }, count)
  }

  function tf(
    key: string,
    fallback: string,
    named?: Record<string, unknown>,
  ): string {
    return te(key) ? t(key, named ?? {}) : fallback
  }

  return {
    t,
    te,
    tm,
    rt,
    d,
    n,
    locale,
    currentLocale,
    availableLocales,
    isGerman,
    isEnglish,
    setLocale,
    toggleLocale,
    formatNumber,
    formatCurrency,
    formatDate,
    tp,
    tf,
  }
}

export type { SupportedLocale }
