import { useI18n } from 'vue-i18n'

export function useValidation() {
  const { t } = useI18n()

  const rules = {
    required: (v: unknown) => !!v || v === 0 || t('validation.required', { field: '' }),
    email: (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || t('validation.email'),
    minLength: (n: number) => (v: string) => !v || v.length >= n || t('validation.minLength', { field: '', min: n }),
    maxLength: (n: number) => (v: string) => !v || v.length <= n || t('validation.maxLength', { field: '', max: n }),
    positiveNumber: (v: unknown) => (!v && v !== 0) || (Number(v) > 0) || 'Must be a positive number',
    slug: (v: string) => !v || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) || 'Only lowercase letters, numbers and hyphens',
    range: (min: number, max: number) => (v: unknown) => (!v && v !== 0) || (Number(v) >= min && Number(v) <= max) || `Must be between ${min} and ${max}`,
  }

  return { rules }
}
