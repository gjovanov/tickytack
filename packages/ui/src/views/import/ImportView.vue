<template>
  <v-container>
    <h2 class="text-h5 mb-4">{{ $t('import.title') }}</h2>

    <v-card variant="outlined" class="pa-4" max-width="700">
      <v-form ref="formRef">
        <v-file-input
          v-model="file"
          :label="$t('import.selectFile')"
          accept=".xlsx"
          prepend-icon="mdi-file-excel-outline"
          variant="outlined"
          density="compact"
          show-size
          :rules="[v => !!v || $t('import.noFile')]"
        />

        <v-btn
          color="secondary"
          :loading="previewLoading"
          :disabled="!file"
          prepend-icon="mdi-eye-outline"
          @click="handlePreview"
          class="mb-4"
        >
          {{ $t('import.preview') }}
        </v-btn>
      </v-form>

      <!-- Period and options -->
      <template v-if="parsed">
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          {{ $t('import.periodDetected') }}: <strong>{{ parsed.startDate }}</strong> — <strong>{{ parsed.endDate }}</strong>
          <span v-if="parsed.existingCount > 0" class="ml-2">
            ({{ $t('import.existingEntries', { count: parsed.existingCount }) }})
          </span>
        </v-alert>

        <v-checkbox
          v-model="replaceExisting"
          :label="$t('import.replaceExisting')"
          :hint="$t('import.replaceExistingHint')"
          persistent-hint
          density="compact"
          class="mb-4"
          color="warning"
        />

        <!-- Validation errors -->
        <v-alert
          v-if="importResult?.errors?.length"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          <div v-for="err in importResult.errors" :key="err.row">
            {{ $t('import.rowError', { row: err.row }) }}: {{ err.message }}
          </div>
        </v-alert>

        <!-- Preview table -->
        <v-data-table
          v-if="parsed.entries.length"
          :headers="previewHeaders"
          :items="parsed.entries"
          density="compact"
          items-per-page="-1"
          hide-default-footer
          class="mb-4"
        >
          <template #item.hours="{ item }">
            {{ item.hours.toFixed(2) }}
          </template>
        </v-data-table>

        <div v-else class="text-body-2 text-medium-emphasis mb-4">
          {{ $t('import.noEntries') }}
        </div>

        <!-- Import button -->
        <v-btn
          color="primary"
          size="large"
          block
          prepend-icon="mdi-upload"
          :loading="importLoading"
          :disabled="!parsed.entries.length"
          @click="handleImport"
        >
          {{ $t('import.importBtn') }}
        </v-btn>
      </template>

      <!-- Success result -->
      <v-alert
        v-if="importResult && !importResult.errors?.length"
        type="success"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        {{ $t('import.imported', { count: importResult.imported }) }}
        <span v-if="importResult.replaced > 0">
          ({{ $t('import.replaced', { count: importResult.replaced }) }})
        </span>
      </v-alert>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import { useSnackbar } from '@/composables/useSnackbar'
import httpClient from '@/services/http-client'

const { t } = useI18n()
const appStore = useAppStore()
const { showSuccess, showError } = useSnackbar()

const formRef = ref(null)
const file = ref(null)
const previewLoading = ref(false)
const importLoading = ref(false)
const parsed = ref(null)
const replaceExisting = ref(false)
const importResult = ref(null)

const previewHeaders = computed(() => [
  { title: t('export.date'), key: 'date', sortable: false },
  { title: t('export.start'), key: 'startTime', sortable: false },
  { title: t('export.end'), key: 'endTime', sortable: false },
  { title: t('export.hours'), key: 'hours', sortable: false },
  { title: t('export.project'), key: 'projectKey', sortable: false },
  { title: t('export.ticket'), key: 'ticketKey', sortable: false },
  { title: t('export.summary'), key: 'summary', sortable: false },
  { title: t('export.description'), key: 'description', sortable: false },
])

async function handlePreview() {
  if (!file.value || !appStore.currentOrg) return

  previewLoading.value = true
  parsed.value = null
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', file.value)

    const response = await httpClient.post(
      `/org/${appStore.currentOrg.id}/import/excel/preview`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    parsed.value = response.data
  } catch (err) {
    showError(err.response?.data?.message || err.message || 'Failed to parse file')
  } finally {
    previewLoading.value = false
  }
}

async function handleImport() {
  if (!file.value || !appStore.currentOrg || !parsed.value) return

  importLoading.value = true
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', file.value)
    formData.append('replaceExisting', String(replaceExisting.value))

    const response = await httpClient.post(
      `/org/${appStore.currentOrg.id}/import/excel`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    importResult.value = response.data

    if (response.data.errors?.length) {
      showError(t('import.hasErrors'))
    } else {
      showSuccess(t('import.imported', { count: response.data.imported }))
    }
  } catch (err) {
    showError(err.response?.data?.message || err.message || 'Import failed')
  } finally {
    importLoading.value = false
  }
}
</script>
