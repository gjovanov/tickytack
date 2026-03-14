<template>
  <v-app theme="light">
    <div class="legal-page">
      <v-container class="legal-container py-12">
        <router-link to="/landing" class="text-body-2 text-primary text-decoration-none d-inline-flex align-center mb-6">
          <v-icon size="small" class="mr-1">mdi-arrow-left</v-icon>
          Back to home
        </router-link>

        <h1 class="text-h3 font-weight-bold mb-2">Deletion Request Status</h1>
        <p class="text-body-2 legal-muted mb-8">Check the status of your data deletion request.</p>

        <!-- No code provided - show input form -->
        <v-card v-if="!code" variant="outlined" class="pa-6" max-width="500">
          <p class="text-body-1 legal-muted mb-4">
            Enter your confirmation code to check the status of your data deletion request.
          </p>
          <v-text-field
            v-model="inputCode"
            label="Confirmation Code"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-btn color="primary" @click="lookupCode">Check Status</v-btn>
        </v-card>

        <!-- Loading -->
        <div v-else-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
          <p class="text-body-1 legal-muted mt-4">Looking up your deletion request...</p>
        </div>

        <!-- Error -->
        <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4" max-width="500">
          {{ error }}
        </v-alert>

        <!-- Result -->
        <v-card v-else-if="result" variant="outlined" class="pa-6" max-width="500">
          <h2 class="text-h6 font-weight-bold mb-4">Deletion Request Found</h2>

          <div class="mb-3">
            <div class="text-body-2 legal-muted">Confirmation Code</div>
            <div class="text-body-1 font-weight-medium">{{ result.confirmationCode }}</div>
          </div>

          <div class="mb-3">
            <div class="text-body-2 legal-muted">Status</div>
            <v-chip :color="statusColor" size="small" class="mt-1">
              {{ statusLabel }}
            </v-chip>
          </div>

          <div class="mb-3">
            <div class="text-body-2 legal-muted">Requested</div>
            <div class="text-body-1">{{ formatDate(result.createdAt) }}</div>
          </div>

          <div v-if="result.completedAt">
            <div class="text-body-2 legal-muted">Completed</div>
            <div class="text-body-1">{{ formatDate(result.completedAt) }}</div>
          </div>
        </v-card>
      </v-container>
    </div>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import httpClient from '@/services/http-client'

const route = useRoute()
const router = useRouter()

const code = ref(route.query.id || '')
const inputCode = ref('')
const loading = ref(false)
const error = ref('')
const result = ref(null)

const statusColor = computed(() => {
  if (!result.value) return 'grey'
  switch (result.value.status) {
    case 'completed': return 'success'
    case 'pending': return 'warning'
    case 'user_not_found': return 'info'
    default: return 'grey'
  }
})

const statusLabel = computed(() => {
  if (!result.value) return ''
  switch (result.value.status) {
    case 'completed': return 'Completed'
    case 'pending': return 'Pending'
    case 'user_not_found': return 'No Matching User Found'
    default: return result.value.status
  }
})

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function lookupCode() {
  if (!inputCode.value.trim()) return
  router.replace({ query: { id: inputCode.value.trim() } })
  code.value = inputCode.value.trim()
  fetchStatus()
}

async function fetchStatus() {
  if (!code.value) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    const res = await httpClient.get(`/facebook/data-deletion/status/${code.value}`)
    result.value = res.data
  } catch (err) {
    if (err.response?.status === 404) {
      error.value = 'No deletion request found with this confirmation code.'
    } else {
      error.value = err.response?.data?.message || 'Failed to look up deletion request.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (code.value) fetchStatus()
})
</script>

<style scoped>
.legal-page {
  background: #ffffff;
  color: #1e1a17;
  min-height: 100vh;
}

.legal-container {
  max-width: 800px;
}

.legal-muted {
  color: rgba(30, 26, 23, 0.7) !important;
  line-height: 1.7;
}
</style>
