<template>
  <v-container>
    <h2 class="text-h5 mb-4">{{ $t('admin.jira.title') }}</h2>

    <!-- Settings Card -->
    <v-card variant="outlined" class="pa-4 mb-4" max-width="600">
      <h3 class="text-h6 mb-3">{{ $t('admin.jira.connection') }}</h3>
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

        <div class="d-flex ga-2">
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
      </v-form>
    </v-card>

    <!-- Import Card -->
    <v-card variant="outlined" class="pa-4 mb-4" max-width="800">
      <h3 class="text-h6 mb-3">{{ $t('admin.jira.importTitle') }}</h3>

      <div class="d-flex ga-2 mb-4 flex-wrap">
        <v-btn
          variant="outlined"
          :loading="loadingProjects"
          prepend-icon="mdi-refresh"
          @click="loadJiraProjects"
        >
          {{ $t('admin.jira.loadProjects') }}
        </v-btn>
        <v-btn
          variant="outlined"
          :loading="importingProjectsJson"
          prepend-icon="mdi-file-upload-outline"
          @click="projectsFileInput?.click()"
        >
          {{ $t('admin.jira.importProjectsJson') }}
        </v-btn>
        <v-btn
          variant="outlined"
          :loading="importingIssuesJson"
          prepend-icon="mdi-file-upload-outline"
          @click="issuesFileInput?.click()"
        >
          {{ $t('admin.jira.importIssuesJson') }}
        </v-btn>
      </div>
      <!-- Hidden file inputs -->
      <input
        ref="projectsFileInput"
        type="file"
        accept=".json,application/json"
        style="display: none"
        @change="handleProjectsJsonUpload"
      />
      <input
        ref="issuesFileInput"
        type="file"
        accept=".json,application/json"
        style="display: none"
        @change="handleIssuesJsonUpload"
      />

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
              <v-checkbox
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

    <!-- VPN Curl Examples (collapsible) -->
    <v-card variant="outlined" class="pa-4" max-width="800">
      <v-expansion-panels variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon class="mr-2">mdi-console</v-icon>
            {{ $t('admin.jira.vpnCurlTitle') }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ $t('admin.jira.vpnCurlDesc') }}
            </p>

            <div class="text-subtitle-2 font-weight-bold mb-1">1. Fetch JIRA Projects</div>
            <v-sheet color="grey-darken-4" class="pa-3 rounded mb-3" style="overflow-x: auto">
              <code class="text-caption text-white" style="white-space: pre">curl -u "your-email@company.com:YOUR_API_TOKEN" \
  "https://your-company.atlassian.net/rest/api/2/project" \
  > projects.json</code>
            </v-sheet>

            <div class="text-subtitle-2 font-weight-bold mb-1">2. Fetch JIRA Issues</div>
            <v-sheet color="grey-darken-4" class="pa-3 rounded mb-3" style="overflow-x: auto">
              <code class="text-caption text-white" style="white-space: pre">curl -u "your-email@company.com:YOUR_API_TOKEN" \
  "https://your-company.atlassian.net/rest/api/2/search?jql=project=PROJ&amp;maxResults=100&amp;fields=summary,description,status,priority,assignee,reporter" \
  > tickets.json</code>
            </v-sheet>

            <div class="text-subtitle-2 font-weight-bold mb-1">Example projects.json</div>
            <v-sheet color="grey-darken-4" class="pa-3 rounded mb-3" style="overflow-x: auto">
              <code class="text-caption text-white" style="white-space: pre">[
  { "id": "10001", "key": "PROJ", "name": "My Project", "description": "..." },
  { "id": "10002", "key": "OPS", "name": "Operations", "description": "..." }
]</code>
            </v-sheet>

            <div class="text-subtitle-2 font-weight-bold mb-1">Example tickets.json</div>
            <v-sheet color="grey-darken-4" class="pa-3 rounded mb-3" style="overflow-x: auto">
              <code class="text-caption text-white" style="white-space: pre">{
  "issues": [
    {
      "id": "10100", "key": "PROJ-101",
      "fields": {
        "summary": "Fix login bug",
        "status": { "name": "In Progress" },
        "priority": { "name": "High" },
        "assignee": { "emailAddress": "dev@company.com", "displayName": "Dev" }
      }
    }
  ],
  "total": 1, "startAt": 0, "maxResults": 100
}</code>
            </v-sheet>

            <v-alert type="info" variant="tonal" density="compact" class="mt-2">
              {{ $t('admin.jira.vpnCurlNote') }}
            </v-alert>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/app'
import { useSnackbar } from '@/composables/useSnackbar'
import httpClient from '@/services/http-client'

const { t } = useI18n()
const appStore = useAppStore()
const { showSuccess, showError } = useSnackbar()

const settingsFormRef = ref(null)
const form = reactive({ jiraBaseUrl: '', jiraEmail: '', jiraApiToken: '' })
const showToken = ref(false)
const hasToken = ref(false)
const saving = ref(false)
const testing = ref(false)
const connectionStatus = ref(null) // null | true | false

const loadingProjects = ref(false)
const jiraProjects = ref([])
const selectedProjects = ref([])
const importingProjects = ref(false)
const importedProjects = ref([])
const importResultMsg = ref('')
const importResultType = ref('info')
const importingProjectsJson = ref(false)
const importingIssuesJson = ref(false)
const projectsFileInput = ref(null)
const issuesFileInput = ref(null)

const projectHeaders = computed(() => [
  { title: t('admin.jira.projectKey'), key: 'key', sortable: true },
  { title: t('admin.jira.projectName'), key: 'name', sortable: true },
])

const orgPrefix = computed(() => {
  if (!appStore.currentOrg) return ''
  return `/org/${appStore.currentOrg.id}/jira`
})

onMounted(async () => {
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
    await httpClient.post(`${orgPrefix.value}/settings/test`)
    connectionStatus.value = true
  } catch {
    connectionStatus.value = false
  } finally {
    testing.value = false
  }
}

async function loadJiraProjects() {
  loadingProjects.value = true
  try {
    const res = await httpClient.get(`${orgPrefix.value}/projects`)
    jiraProjects.value = res.data
  } catch (err) {
    showError(err.response?.data?.message || 'Failed to load JIRA projects')
  } finally {
    loadingProjects.value = false
  }
}

async function handleImportProjects() {
  importingProjects.value = true
  importResultMsg.value = ''
  try {
    const res = await httpClient.post(`${orgPrefix.value}/import/projects`, {
      projectKeys: selectedProjects.value,
    })
    const r = res.data
    importResultMsg.value = `${t('admin.jira.projectsImported')}: ${r.created} created, ${r.updated} updated`
    importResultType.value = r.errors?.length ? 'warning' : 'success'

    // Build list for issue import
    importedProjects.value = selectedProjects.value.map((key) => {
      const p = jiraProjects.value.find((j) => j.key === key)
      return reactive({ key, name: p?.name || key, importing: false, includeAttachments: false })
    })
  } catch (err) {
    showError(err.response?.data?.message || 'Failed to import projects')
  } finally {
    importingProjects.value = false
  }
}

async function handleImportIssues(proj) {
  proj.importing = true
  importResultMsg.value = ''
  try {
    const res = await httpClient.post(`${orgPrefix.value}/import/issues`, {
      projectKey: proj.key,
      includeAttachments: proj.includeAttachments,
    })
    const r = res.data
    importResultMsg.value = `${proj.key}: ${r.created} created, ${r.updated} updated`
    if (r.errors?.length) {
      importResultMsg.value += `, ${r.errors.length} errors`
      importResultType.value = 'warning'
    } else {
      importResultType.value = 'success'
    }
    showSuccess(importResultMsg.value)
  } catch (err) {
    showError(err.response?.data?.message || 'Failed to import issues')
  } finally {
    proj.importing = false
  }
}

async function handleProjectsJsonUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  importingProjectsJson.value = true
  importResultMsg.value = ''
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await httpClient.post(`${orgPrefix.value}/import/projects-json`, formData)
    const r = res.data
    importResultMsg.value = `${t('admin.jira.projectsImported')}: ${r.created} created, ${r.updated} updated`
    if (r.errors?.length) {
      importResultMsg.value += `, ${r.errors.length} errors`
      importResultType.value = 'warning'
    } else {
      importResultType.value = 'success'
    }
    showSuccess(importResultMsg.value)
  } catch (err) {
    showError(err.response?.data?.message || 'Failed to import projects JSON')
  } finally {
    importingProjectsJson.value = false
    event.target.value = ''
  }
}

async function handleIssuesJsonUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  importingIssuesJson.value = true
  importResultMsg.value = ''
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await httpClient.post(`${orgPrefix.value}/import/issues-json`, formData)
    const r = res.data
    importResultMsg.value = `Issues: ${r.created} created, ${r.updated} updated`
    if (r.errors?.length) {
      importResultMsg.value += `, ${r.errors.length} errors`
      importResultType.value = 'warning'
    } else {
      importResultType.value = 'success'
    }
    showSuccess(importResultMsg.value)
  } catch (err) {
    showError(err.response?.data?.message || 'Failed to import issues JSON')
  } finally {
    importingIssuesJson.value = false
    event.target.value = ''
  }
}
</script>
