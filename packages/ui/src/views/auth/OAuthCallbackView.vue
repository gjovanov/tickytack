<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" sm="6" class="text-center">
        <v-progress-circular v-if="!error" indeterminate color="primary" size="64" />
        <div v-if="!error" class="mt-4 text-body-1">Completing login...</div>
        <v-alert v-if="error" type="error" class="mt-4">
          {{ error }}
          <template #append>
            <v-btn variant="text" :to="{ name: 'auth.login' }">Back to login</v-btn>
          </template>
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/store/app'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const error = ref('')

onMounted(async () => {
  const token = route.query.token
  if (!token) {
    error.value = 'No token received from OAuth provider'
    return
  }

  try {
    localStorage.setItem('ttt_token', token)
    await appStore.fetchMe()
    router.push({ name: 'timesheet' })
  } catch (e) {
    error.value = 'Failed to complete OAuth login'
    localStorage.removeItem('ttt_token')
  }
})
</script>
