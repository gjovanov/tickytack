<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center">
      <v-col cols="12" sm="6" class="text-center">
        <template v-if="status === 'pending'">
          <v-progress-circular indeterminate color="primary" size="64" />
          <div class="mt-4 text-body-1">Activating your account...</div>
        </template>
        <v-alert v-else :type="status === 'done' ? 'success' : 'error'" class="mt-4">
          {{ message }}
          <template #append>
            <v-btn variant="text" :to="{ name: 'auth.login' }">
              {{ status === 'done' ? 'Sign in' : 'Back to login' }}
            </v-btn>
          </template>
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
/**
 * Activates an account from the link in the activation email.
 *
 * The link carries the code in the fragment (`#userId=…&token=…`), which never reaches a server
 * log or a `Referer`. Links sent before that carry it in the query, and keep working. Either way
 * it is read once, here, and removed from the address before this view makes any request.
 */
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import httpClient from '@/services/http-client'

const router = useRouter()
const route = useRoute()
const status = ref('pending')
const message = ref('')

const first = (v) => (Array.isArray(v) ? v[0] : v) || ''
const fragment = new URLSearchParams(route.hash.replace(/^#/, ''))
const userId = fragment.get('userId') || first(route.query.userId)
const token = fragment.get('token') || first(route.query.token)

onMounted(async () => {
  await router.replace({ name: 'auth.activate' })

  if (!userId || !token) {
    status.value = 'error'
    message.value = 'This activation link is incomplete. Please open the link from your email again.'
    return
  }
  try {
    const { data } = await httpClient.post('/auth/activate', { userId, token })
    status.value = 'done'
    message.value = data.message
  } catch (e) {
    status.value = 'error'
    message.value = e?.response?.data?.message || 'Activation failed'
  }
})
</script>
