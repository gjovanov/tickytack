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
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="form.lastName"
                    :label="$t('auth.register.lastName')"
                    :rules="[rules.required]"
                    variant="outlined"
                    density="compact"
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
              <v-text-field
                v-model="form.orgName"
                :label="$t('auth.register.orgName')"
                prepend-inner-icon="mdi-office-building-outline"
                :rules="[rules.required]"
                variant="outlined"
                density="compact"
                class="mb-2"
              />
              <v-text-field
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/store/app'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
const appStore = useAppStore()

const formRef = ref(null)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  orgName: '',
  orgSlug: '',
})

const rules = {
  required: (v) => !!v || t('validation.required', { field: '' }),
  email: (v) => /.+@.+\..+/.test(v) || t('validation.email'),
  minLength: (min) => (v) =>
    (v && v.length >= min) || t('validation.minLength', { field: '', min }),
}

async function handleRegister() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  loading.value = true
  error.value = ''
  try {
    await appStore.register(form.value)
    router.push({ name: 'timesheet' })
  } catch (err) {
    error.value = err.response?.data?.message || t('errors.generic')
  } finally {
    loading.value = false
  }
}
</script>
