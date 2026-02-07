<template>
  <v-container>
    <h2 class="text-h5 mb-4">{{ $t('export.title') }}</h2>

    <v-card variant="outlined" class="pa-4" max-width="600">
      <v-form ref="formRef">
        <v-select
          v-model="form.format"
          :items="formatOptions"
          :label="$t('export.format')"
          variant="outlined"
          density="compact"
          class="mb-4"
        />

        <v-row dense>
          <v-col cols="6">
            <v-text-field
              v-model="form.startDate"
              :label="$t('export.startDate')"
              type="date"
              :rules="[v => !!v || $t('validation.required', { field: $t('export.startDate') })]"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="form.endDate"
              :label="$t('export.endDate')"
              type="date"
              :rules="[v => !!v || $t('validation.required', { field: $t('export.endDate') })]"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-btn
          color="primary"
          size="large"
          block
          prepend-icon="mdi-download"
          :loading="loading"
          @click="handleExport"
          class="mt-4"
        >
          {{ $t('export.download') }}
        </v-btn>
      </v-form>
    </v-card>

    <!-- Preview table -->
    <v-card v-if="form.startDate && form.endDate" variant="outlined" class="pa-4 mt-4">
      <h3 class="text-h6 mb-3">{{ $t('export.preview') }}</h3>

      <v-data-table
        v-if="previewEntries.length"
        :headers="previewHeaders"
        :items="previewEntries"
        :loading="previewLoading"
        density="compact"
        items-per-page="-1"
        hide-default-footer
      >
        <template #item.date="{ item }">
          {{ formatDate(item.date) }}
        </template>
        <template #item.hours="{ item }">
          {{ (item.durationMinutes / 60).toFixed(2) }}
        </template>
        <template #item.project="{ item }">
          {{ item.projectId?.key || '' }}
        </template>
        <template #item.ticket="{ item }">
          {{ item.ticketId?.key || '' }}
        </template>
        <template #item.summary="{ item }">
          {{ item.ticketId?.summary || '' }}
        </template>
        <template #item.description="{ item }">
          <v-text-field
            :model-value="descriptionOverrides[item._id] ?? item.description ?? ''"
            @update:model-value="descriptionOverrides[item._id] = $event"
            variant="plain"
            density="compact"
            hide-details
          />
        </template>
      </v-data-table>

      <div v-else-if="!previewLoading" class="text-body-2 text-medium-emphasis">
        {{ $t('export.noEntries') }}
      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, watch, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import httpClient from '@/services/http-client'

const { t, locale } = useI18n()
const appStore = useAppStore()

const formRef = ref(null)
const loading = ref(false)
const previewLoading = ref(false)
const previewEntries = ref([])
const descriptionOverrides = reactive({})

const form = ref({
  format: 'excel',
  startDate: '',
  endDate: '',
})

const formatOptions = [
  { title: t('export.excel'), value: 'excel' },
  { title: t('export.pdf'), value: 'pdf' },
]

const previewHeaders = [
  { title: t('export.date'), key: 'date', sortable: false },
  { title: t('export.start'), key: 'startTime', sortable: false },
  { title: t('export.end'), key: 'endTime', sortable: false },
  { title: t('export.hours'), key: 'hours', sortable: false },
  { title: t('export.project'), key: 'project', sortable: false },
  { title: t('export.ticket'), key: 'ticket', sortable: false },
  { title: t('export.summary'), key: 'summary', sortable: false },
  { title: t('export.description'), key: 'description', sortable: false },
]

function formatDate(d) {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  return date.toISOString().split('T')[0]
}

watch(
  () => [form.value.startDate, form.value.endDate],
  async ([startDate, endDate]) => {
    if (!startDate || !endDate || !appStore.currentOrg) {
      previewEntries.value = []
      return
    }

    previewLoading.value = true
    try {
      const response = await httpClient.get(
        `/org/${appStore.currentOrg.id}/timeentry`,
        { params: { startDate, endDate } },
      )
      previewEntries.value = response.data
    } catch (err) {
      console.error('Failed to load preview:', err)
      previewEntries.value = []
    } finally {
      previewLoading.value = false
    }
  },
)

async function handleExport() {
  const { valid } = await formRef.value.validate()
  if (!valid || !appStore.currentOrg) return

  loading.value = true
  try {
    const response = await httpClient.post(
      `/org/${appStore.currentOrg.id}/export/${form.value.format}`,
      {
        startDate: form.value.startDate,
        endDate: form.value.endDate,
        locale: locale.value,
        descriptionOverrides,
      },
      { responseType: 'blob' },
    )

    // Download file
    const ext = form.value.format === 'excel' ? 'xlsx' : 'pdf'
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `timesheet-${form.value.startDate}-${form.value.endDate}.${ext}`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export failed:', err)
  } finally {
    loading.value = false
  }
}
</script>
