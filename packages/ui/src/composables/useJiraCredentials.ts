import { ref, computed } from 'vue'
import { JiraClientService } from '@/services/jira-client'

const STORAGE_KEY = 'ttt_jira_credentials'

function load() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const stored = load()
const jiraBaseUrl = ref<string>(stored?.jiraBaseUrl || '')
const jiraEmail = ref<string>(stored?.jiraEmail || '')
const jiraApiToken = ref<string>(stored?.jiraApiToken || '')

function persist() {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      jiraBaseUrl: jiraBaseUrl.value,
      jiraEmail: jiraEmail.value,
      jiraApiToken: jiraApiToken.value,
    }),
  )
}

export function useJiraCredentials() {
  const hasCredentials = computed(
    () => !!jiraBaseUrl.value && !!jiraEmail.value && !!jiraApiToken.value,
  )

  function saveCredentials(baseUrl: string, email: string, token: string) {
    jiraBaseUrl.value = baseUrl
    jiraEmail.value = email
    jiraApiToken.value = token
    persist()
  }

  function clearCredentials() {
    jiraBaseUrl.value = ''
    jiraEmail.value = ''
    jiraApiToken.value = ''
    sessionStorage.removeItem(STORAGE_KEY)
  }

  function createClient(): JiraClientService {
    if (!hasCredentials.value) {
      throw new Error('JIRA credentials not configured')
    }
    return new JiraClientService(jiraBaseUrl.value, jiraEmail.value, jiraApiToken.value)
  }

  return {
    jiraBaseUrl,
    jiraEmail,
    jiraApiToken,
    hasCredentials,
    saveCredentials,
    clearCredentials,
    createClient,
  }
}
