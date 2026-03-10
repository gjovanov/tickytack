<template>
  <v-container>
    <h2 class="text-h5 mb-4">{{ $t('admin.jira.title') }}</h2>

    <!-- Mode Toggle -->
    <v-btn-toggle v-model="integrationMode" mandatory color="primary" class="mb-4">
      <v-btn value="server" prepend-icon="mdi-server">
        {{ $t('admin.jira.modeServer') }}
      </v-btn>
      <v-btn value="client" prepend-icon="mdi-laptop">
        {{ $t('admin.jira.modeClient') }}
      </v-btn>
    </v-btn-toggle>

    <v-alert
      :type="integrationMode === 'client' ? 'info' : 'warning'"
      variant="tonal"
      density="compact"
      class="mb-4"
      max-width="600"
    >
      {{ integrationMode === 'client' ? $t('admin.jira.modeClientDesc') : $t('admin.jira.modeServerDesc') }}
    </v-alert>

    <!-- Settings Card -->
    <v-card variant="outlined" class="pa-4 mb-4" max-width="600">
      <h3 class="text-h6 mb-3">{{ $t('admin.jira.connection') }}</h3>

      <!-- Client-side credentials info -->
      <v-alert
        v-if="integrationMode === 'client'"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        {{ $t('admin.jira.clientCredentialsInfo') }}
      </v-alert>

      <v-form ref="settingsFormRef">
        <v-text-field
          v-model="form.jiraBaseUrl"
          :label="$t('admin.jira.baseUrl')"
          :placeholder="$t('admin.jira.baseUrlPlaceholder')"
          :rules="[v => !!v || $t('validation.required', { field: $t('admin.jira.baseUrl') })]"
          variant="outlined"
          density="compact"
          class="mb-2"
        />
        <v-text-field
          v-model="form.jiraEmail"
          :label="$t('admin.jira.email')"
          type="email"
          :rules="[v => !!v || $t('validation.required', { field: $t('admin.jira.email') })]"
          variant="outlined"
          density="compact"
          class="mb-2"
        />
        <v-text-field
          v-model="form.jiraApiToken"
          :label="$t('admin.jira.apiToken')"
          :type="showToken ? 'text' : 'password'"
          :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showToken = !showToken"
          :rules="[v => (!!v || hasToken) || $t('validation.required', { field: $t('admin.jira.apiToken') })]"
          :placeholder="hasToken ? '••••••••' : ''"
          variant="outlined"
          density="compact"
          class="mb-2"
        />

        <div class="d-flex ga-2 flex-wrap">
          <v-btn
            color="primary"
            :loading="saving"
            @click="handleSave"
          >
            {{ $t('common.actions.save') }}
          </v-btn>
          <v-btn
            variant="outlined"
            :loading="testing"
            @click="handleTestConnection"
          >
            <v-icon start>{{ connectionStatus === true ? 'mdi-check-circle' : connectionStatus === false ? 'mdi-close-circle' : 'mdi-connection' }}</v-icon>
            {{ $t('admin.jira.testConnection') }}
          </v-btn>
          <v-btn
            v-if="integrationMode === 'client'"
            variant="text"
            color="error"
            @click="handleClearCredentials"
          >
            {{ $t('admin.jira.clearCredentials') }}
          </v-btn>
        </div>

        <v-alert
          v-if="connectionStatus === true"
          type="success"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          {{ $t('admin.jira.connected') }}
        </v-alert>
        <v-alert
          v-if="connectionStatus === false"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          {{ $t('admin.jira.connectionFailed') }}
        </v-alert>

        <!-- CORS warning for client mode -->
        <v-alert
          v-if="integrationMode === 'client' && connectionStatus === false"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          {{ $t('admin.jira.corsWarning') }}
        </v-alert>
      </v-form>
    </v-card>

    <!-- Import Card -->
    <v-card variant="outlined" class="pa-4" max-width="800">
      <h3 class="text-h6 mb-3">{{ $t('admin.jira.importTitle') }}</h3>

      <v-btn
        variant="outlined"
        :loading="loadingProjects"
        prepend-icon="mdi-refresh"
        @click="loadJiraProjects"
        class="mb-4"
      >
        {{ $t('admin.jira.loadProjects') }}
      </v-btn>

      <v-data-table
        v-if="jiraProjects.length"
        v-model="selectedProjects"
        :headers="projectHeaders"
        :items="jiraProjects"
        item-value="key"
        show-select
        density="compact"
        class="mb-4"
      />

      <div v-if="selectedProjects.length" class="d-flex ga-2 mb-4">
        <v-btn
          color="primary"
          :loading="importingProjects"
          prepend-icon="mdi-folder-download-outline"
          @click="handleImportProjects"
        >
          {{ $t('admin.jira.importProjects', { count: selectedProjects.length }) }}
        </v-btn>
      </div>

      <!-- Import issues per project -->
      <template v-if="importedProjects.length">
        <v-divider class="my-4" />
        <h3 class="text-subtitle-1 font-weight-bold mb-3">{{ $t('admin.jira.importIssues') }}</h3>

        <v-list density="compact">
          <v-list-item
            v-for="proj in importedProjects"
            :key="proj.key"
            :title="proj.name"
            :subtitle="proj.key"
          >
            <template #append>
              <v-tooltip v-if="integrationMode === 'client'" :text="$t('admin.jira.attachmentsClientDisabled')" location="top">
                <template #activator="{ props }">
                  <v-checkbox
                    v-bind="props"
                    :model-value="false"
                    disabled
                    :label="$t('admin.jira.attachments')"
                    density="compact"
                    hide-details
                    class="mr-2"
                  />
                </template>
              </v-tooltip>
              <v-checkbox
                v-else
                v-model="proj.includeAttachments"
                :label="$t('admin.jira.attachments')"
                density="compact"
                hide-details
                class="mr-2"
              />
              <v-btn
                size="small"
                color="primary"
                variant="outlined"
                :loading="proj.importing"
                prepend-icon="mdi-download"
                @click="handleImportIssues(proj)"
              >
                {{ $t('admin.jira.importIssuesBtn') }}
              </v-btn>
            </template>
          </v-list-item>
        </v-list>

        <!-- Client-side progress -->
        <v-alert
          v-if="fetchProgress"
          type="info"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          {{ $t('admin.jira.fetchingIssues') }} {{ fetchProgress }}
        </v-alert>
      </template>

      <!-- Import result -->
      <v-alert
        v-if="importResultMsg"
        :type="importResultType"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        {{ importResultMsg }}
      </v-alert>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import { useSnackbar } from '@/composables/useSnackbar'
import { useJiraCredentials } from '@/composables/useJiraCredentials'
import httpClient from '@/services/http-client'

const { t } = useI18n()
const appStore = useAppStore()
const { showSuccess, showError } = useSnackbar()
const jiraCredentials = useJiraCredentials()

const settingsFormRef = ref(null)
const form = reactive({ jiraBaseUrl: '', jiraEmail: '', jiraApiToken: '' })
const showToken = ref(false)
const hasToken = ref(false)
const saving = ref(false)
const testing = ref(false)
const connectionStatus = ref(null) // null | true | false

const integrationMode = ref(localStorage.getItem('ttt_jira_mode') || 'server')

const loadingProjects = ref(false)
const jiraProjects = ref([])
const selectedProjects = ref([])
const importingProjects = ref(false)
const importedProjects = ref([])
const importResultMsg = ref('')
const importResultType = ref('info')
const fetchProgress = ref('')

const projectHeaders = computed(() => [
  { title: t('admin.jira.projectKey'), key: 'key', sortable: true },
  { title: t('admin.jira.projectName'), key: 'name', sortable: true },
])

const orgPrefix = computed(() => {
  if (!appStore.currentOrg) return ''
  return `/org/${appStore.currentOrg.id}/jira`
})

// Persist mode choice
watch(integrationMode, (mode) => {
  localStorage.setItem('ttt_jira_mode', mode)
  connectionStatus.value = null
  jiraProjects.value = []
  selectedProjects.value = []
  importedProjects.value = []
  importResultMsg.value = ''
  fetchProgress.value = ''
  loadCredentialsForMode(mode)
})

function loadCredentialsForMode(mode) {
  if (mode === 'client') {
    form.jiraBaseUrl = jiraCredentials.jiraBaseUrl.value || ''
    form.jiraEmail = jiraCredentials.jiraEmail.value || ''
    form.jiraApiToken = jiraCredentials.jiraApiToken.value || ''
    hasToken.value = !!jiraCredentials.jiraApiToken.value
  }
}

onMounted(async () => {
  if (integrationMode.value === 'client') {
    loadCredentialsForMode('client')
    return
  }
  if (!appStore.currentOrg) return
  try {
    const res = await httpClient.get(`${orgPrefix.value}/settings`)
    form.jiraBaseUrl = res.data.jiraBaseUrl || ''
    form.jiraEmail = res.data.jiraEmail || ''
    hasToken.value = res.data.hasToken || false
  } catch {
    // No settings yet
  }
})

async function handleSave() {
  const { valid } = await settingsFormRef.value.validate()
  if (!valid) return

  if (integrationMode.value === 'client') {
    if (!form.jiraApiToken && !jiraCredentials.jiraApiToken.value) {
      showError(t('admin.jira.tokenRequired'))
      return
    }
    jiraCredentials.saveCredentials(
      form.jiraBaseUrl,
      form.jiraEmail,
      form.jiraApiToken || jiraCredentials.jiraApiToken.value,
    )
    hasToken.value = true
    showSuccess(t('admin.jira.saved'))
    return
  }

  // Server-side save
  if (!form.jiraApiToken && hasToken.value) {
    showError(t('admin.jira.tokenRequired'))
    return
  }

  saving.value = true
  try {
    await httpClient.put(`${orgPrefix.value}/settings`, {
      jiraBaseUrl: form.jiraBaseUrl,
      jiraEmail: form.jiraEmail,
      jiraApiToken: form.jiraApiToken,
    })
    hasToken.value = true
    showSuccess(t('admin.jira.saved'))
  } catch (err) {
    showError(err.response?.data?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

async function handleTestConnection() {
  testing.value = true
  connectionStatus.value = null
  try {
    if (integrationMode.value === 'client') {
      const client = jiraCredentials.createClient()
      connectionStatus.value = await client.testConnection()
    } else {
      await httpClient.post(`${orgPrefix.value}/settings/test`)
      connectionStatus.value = true
    }
  } catch {
    connectionStatus.value = false
  } finally {
    testing.value = false
  }
}

function handleClearCredentials() {
  jiraCredentials.clearCredentials()
  form.jiraBaseUrl = ''
  form.jiraEmail = ''
  form.jiraApiToken = ''
  hasToken.value = false
  connectionStatus.value = null
  showSuccess(t('admin.jira.credentialsCleared'))
}

async function loadJiraProjects() {
  loadingProjects.value = true
  try {
    if (integrationMode.value === 'client') {
      const client = jiraCredentials.createClient()
      jiraProjects.value = await client.getProjects()
    } else {
      const res = await httpClient.get(`${orgPrefix.value}/projects`)
      jiraProjects.value = res.data
    }
  } catch (err) {
    showError(err.response?.data?.message || err.message || 'Failed to load JIRA projects')
  } finally {
    loadingProjects.value = false
  }
}

async function handleImportProjects() {
  importingProjects.value = true
  importResultMsg.value = ''
  try {
    let r
    if (integrationMode.value === 'client') {
      const selected = jiraProjects.value.filter((p) => selectedProjects.value.includes(p.key))
      const res = await httpClient.post(`${orgPrefix.value}/import/projects-data`, {
        projects: selected,
      })
      r = res.data
    } else {
      const res = await httpClient.post(`${orgPrefix.value}/import/projects`, {
        projectKeys: selectedProjects.value,
      })
      r = res.data
    }

    importResultMsg.value = `${t('admin.jira.projectsImported')}: ${r.created} created, ${r.updated} updated`
    importResultType.value = r.errors?.length ? 'warning' : 'success'

    importedProjects.value = selectedProjects.value.map((key) => {
      const p = jiraProjects.value.find((j) => j.key === key)
      return reactive({ key, name: p?.name || key, importing: false, includeAttachments: false })
    })
  } catch (err) {
    showError(err.response?.data?.message || err.message || 'Failed to import projects')
  } finally {
    importingProjects.value = false
  }
}

async function handleImportIssues(proj) {
  proj.importing = true
  importResultMsg.value = ''
  fetchProgress.value = ''
  try {
    let r
    if (integrationMode.value === 'client') {
      const client = jiraCredentials.createClient()
      const allIssues = await client.getAllIssues(proj.key, (fetched, total) => {
        fetchProgress.value = `${fetched} / ${total}`
      })
      fetchProgress.value = ''
      const res = await httpClient.post(`${orgPrefix.value}/import/issues-data`, {
        projectKey: proj.key,
        issues: allIssues,
      })
      r = res.data
    } else {
      const res = await httpClient.post(`${orgPrefix.value}/import/issues`, {
        projectKey: proj.key,
        includeAttachments: proj.includeAttachments,
      })
      r = res.data
    }

    importResultMsg.value = `${proj.key}: ${r.created} created, ${r.updated} updated`
    if (r.errors?.length) {
      importResultMsg.value += `, ${r.errors.length} errors`
      importResultType.value = 'warning'
    } else {
      importResultType.value = 'success'
    }
    showSuccess(importResultMsg.value)
  } catch (err) {
    showError(err.response?.data?.message || err.message || 'Failed to import issues')
  } finally {
    proj.importing = false
    fetchProgress.value = ''
  }
}
</script>
