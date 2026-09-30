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
/**
 * Finishes an OAuth sign-in.
 *
 * ⚠ It reads NOTHING from the address. The OAuth callback leaves a one-time code in an httpOnly
 * cookie; this view asks the server to redeem it, and the server alone decides who signs in.
 * Anything that arrives in the address is removed from it and ignored.
 */
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/store/app'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const error = ref('')

onMounted(async () => {
  if (Object.keys(route.query).length || route.hash) {
    await router.replace({ name: 'auth.oauth-callback' })
  }

  try {
    await appStore.redeemOAuth()
    await appStore.fetchMe()
    router.push({ name: 'timesheet' })
  } catch (e) {
    error.value = e?.response?.data?.message || 'Failed to complete OAuth login'
  }
})
</script>
