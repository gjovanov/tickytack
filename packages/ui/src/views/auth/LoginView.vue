<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card elevation="8" class="pa-4">
          <v-card-title class="text-center text-h5">
            {{ $t('auth.login.title') }}
          </v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="handleLogin">
              <v-text-field
                v-model="form.orgSlug"
                :label="$t('auth.login.orgSlug')"
                prepend-inner-icon="mdi-office-building-outline"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                class="mb-2"
              />
              <v-text-field
                v-model="form.username"
                :label="$t('auth.login.username')"
                prepend-inner-icon="mdi-account-outline"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                class="mb-2"
              />
              <v-text-field
                v-model="form.password"
                :label="$t('auth.login.password')"
                prepend-inner-icon="mdi-lock-outline"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
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
                {{ $t('auth.login.submit') }}
              </v-btn>
            </v-form>
          </v-card-text>
          <v-divider class="mx-4 my-2" />
          <v-card-text class="text-center pb-2 text-body-2">{{ $t('auth.login.orLoginWith') || 'Or login with' }}</v-card-text>
          <div class="d-flex flex-wrap justify-center ga-2 px-4 pb-4">
            <v-btn
              v-for="p in oauthProviders"
              :key="p.name"
              @click="oauthLogin(p.name)"
              :color="p.color"
              variant="outlined"
              size="small"
              :disabled="!form.orgSlug"
            >
              <v-icon start>{{ p.icon }}</v-icon>
              {{ p.label }}
            </v-btn>
          </div>
          <v-card-actions class="justify-center">
            <span class="text-body-2">{{ $t('auth.login.noAccount') }}</span>
            <router-link :to="{ name: 'auth.register' }" class="ml-1">
              {{ $t('auth.login.registerLink') }}
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

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

const formRef = ref(null)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const form = ref({
  username: '',
  password: '',
  orgSlug: '',
})

const oauthProviders = [
  { name: 'google', label: 'Google', icon: 'mdi-google', color: '#DB4437' },
  { name: 'facebook', label: 'Facebook', icon: 'mdi-facebook', color: '#4267B2' },
  { name: 'github', label: 'GitHub', icon: 'mdi-github', color: '#333' },
  { name: 'linkedin', label: 'LinkedIn', icon: 'mdi-linkedin', color: '#0077B5' },
  { name: 'microsoft', label: 'Microsoft', icon: 'mdi-microsoft', color: '#00A4EF' },
]

const rules = {
  required: (v) => !!v || t('validation.required', { field: '' }),
}

onMounted(() => {
  const invite = route.query.invite
  if (invite) {
    sessionStorage.setItem('ttt_invite_code', invite)
  }
})

function oauthLogin(provider) {
  window.location.href = `/api/oauth/${provider}?org_slug=${encodeURIComponent(form.value.orgSlug)}`
}

async function handleLogin() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  loading.value = true
  error.value = ''
  try {
    await appStore.login(form.value.username, form.value.password, form.value.orgSlug)
    const pendingInvite = sessionStorage.getItem('ttt_invite_code')
    if (pendingInvite) {
      router.push({ name: 'invite', params: { code: pendingInvite } })
    } else {
      router.push({ name: 'timesheet' })
    }
  } catch (err) {
    error.value = t('errors.loginFailed')
  } finally {
    loading.value = false
  }
}
</script>
