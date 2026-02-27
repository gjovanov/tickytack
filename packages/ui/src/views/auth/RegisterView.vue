<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card elevation="8" class="pa-4">
          <v-card-title class="text-center text-h5">
            {{ $t('auth.register.title') }}
          </v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="handleRegister">
              <v-row dense>
                <v-col cols="6">
                  <v-text-field
                    v-model="form.firstName"
                    :label="$t('auth.register.firstName')"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="compact"
                    :readonly="isOAuth"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="form.lastName"
                    :label="$t('auth.register.lastName')"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="compact"
                    :readonly="isOAuth"
                  />
                </v-col>
              </v-row>
              <v-text-field
                v-model="form.email"
                :label="$t('auth.register.email')"
                type="email"
                prepend-inner-icon="mdi-email-outline"
                :rules="[rules.required, rules.email]"
                variant="outlined"
                density="compact"
                class="mb-2"
                :readonly="isOAuth"
              />
              <v-text-field
                v-model="form.username"
                :label="$t('auth.register.username')"
                prepend-inner-icon="mdi-account-outline"
                :rules="[rules.required, rules.minLength(3)]"
                variant="outlined"
                density="compact"
                class="mb-2"
              />
              <v-text-field
                v-if="!isOAuth"
                v-model="form.password"
                :label="$t('auth.register.password')"
                prepend-inner-icon="mdi-lock-outline"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                :rules="[rules.required, rules.minLength(6)]"
                variant="outlined"
                density="compact"
                class="mb-2"
              />
              <v-divider class="my-3" />
              <v-alert
                v-if="inviteOrgName"
                type="info"
                variant="tonal"
                density="compact"
                class="mb-4"
              >
                Joining <strong>{{ inviteOrgName }}</strong>
              </v-alert>
              <v-text-field
                v-if="!inviteCode"
                v-model="form.orgName"
                :label="$t('auth.register.orgName')"
                prepend-inner-icon="mdi-office-building-outline"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                class="mb-2"
                @input="autoSlug"
              />
              <v-text-field
                v-if="!inviteCode"
                v-model="form.orgSlug"
                :label="$t('auth.register.orgSlug')"
                prepend-inner-icon="mdi-link-variant"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                hint="URL-friendly identifier (e.g. my-company)"
                class="mb-4"
              />
              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                density="compact"
                class="mb-4"
              >
                {{ error }}
              </v-alert>
              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="loading"
              >
                {{ $t('auth.register.submit') }}
              </v-btn>
            </v-form>
          </v-card-text>
          <template v-if="!isOAuth">
            <v-divider class="mx-4 my-2" />
            <v-card-text class="text-center pb-2 text-body-2">{{ $t('auth.register.orRegisterWith') || 'Or register with' }}</v-card-text>
            <div class="d-flex flex-wrap justify-center ga-2 px-4 pb-4">
              <v-btn
                v-for="p in oauthProviders"
                :key="p.name"
                @click="oauthRegister(p.name)"
                :color="p.color"
                variant="outlined"
                size="small"
              >
                <v-icon start>{{ p.icon }}</v-icon>
                {{ p.label }}
              </v-btn>
            </div>
          </template>
          <v-card-actions class="justify-center">
            <span class="text-body-2">{{ $t('auth.register.hasAccount') }}</span>
            <router-link :to="{ name: 'auth.login' }" class="ml-1">
              {{ $t('auth.register.loginLink') }}
            </router-link>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/store/app'
import { useI18n } from 'vue-i18n'
import { useValidation } from '@/composables/useValidation'

const { t } = useI18n()
const { rules } = useValidation()
const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

const formRef = ref(null)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const isOAuth = ref(false)
const oauthToken = ref('')

const inviteCode = ref('')
const inviteOrgName = ref('')

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  orgName: '',
  orgSlug: '',
})

const oauthProviders = [
  { name: 'google', label: 'Google', icon: 'mdi-google', color: '#DB4437' },
  { name: 'facebook', label: 'Facebook', icon: 'mdi-facebook', color: '#4267B2' },
  { name: 'github', label: 'GitHub', icon: 'mdi-github', color: '#333' },
  { name: 'linkedin', label: 'LinkedIn', icon: 'mdi-linkedin', color: '#0077B5' },
  { name: 'microsoft', label: 'Microsoft', icon: 'mdi-microsoft', color: '#00A4EF' },
]

// rules provided by useValidation composable

function decodeJwtPayload(token) {
  const payload = token.split('.')[1]
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
}

onMounted(async () => {
  // Check for invite code
  const invite = route.query.invite || sessionStorage.getItem('ttt_invite_code')
  if (invite) {
    inviteCode.value = invite
    sessionStorage.setItem('ttt_invite_code', invite)
    try {
      const { data } = await (await import('@/services/http-client')).default.get(`/invite/${invite}`)
      if (data.isValid) {
        inviteOrgName.value = data.orgName
      }
    } catch {
      // ignore
    }
  }

  const token = route.query.oauth_token
  if (token) {
    oauthToken.value = token
    isOAuth.value = true
    try {
      const payload = decodeJwtPayload(token)
      form.value.email = payload.email || ''
      const nameParts = (payload.name || '').split(' ')
      form.value.firstName = nameParts[0] || ''
      form.value.lastName = nameParts.slice(1).join(' ') || ''
      form.value.username = (payload.name || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    } catch {
      // ignore decode errors
    }
  }
})

function autoSlug() {
  form.value.orgSlug = form.value.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function oauthRegister(provider) {
  window.location.href = `/api/oauth/${provider}?mode=register`
}

async function handleRegister() {
  if (!isOAuth.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  loading.value = true
  error.value = ''
  try {
    if (isOAuth.value) {
      await appStore.registerOAuth({
        oauthToken: oauthToken.value,
        orgName: form.value.orgName,
        orgSlug: form.value.orgSlug,
        username: form.value.username,
      })
    } else {
      const payload = { ...form.value }
      if (inviteCode.value) {
        payload.inviteCode = inviteCode.value
      }
      await appStore.register(payload)
    }
    sessionStorage.removeItem('ttt_invite_code')
    router.push({ name: 'timesheet' })
  } catch (err) {
    error.value = err.response?.data?.message || t('errors.generic')
  } finally {
    loading.value = false
  }
}
</script>
