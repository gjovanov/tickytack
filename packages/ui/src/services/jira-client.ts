export interface JiraProject {
  id: string
  key: string
  name: string
  description?: string
}

export interface JiraIssue {
  id: string
  key: string
  fields: {
    summary: string
    description?: string
    status: { name: string }
    priority?: { name: string }
    assignee?: { emailAddress: string; displayName: string }
    reporter?: { emailAddress: string; displayName: string }
    attachment?: Array<{
      id: string
      filename: string
      mimeType: string
      size: number
      content: string
    }>
  }
}

export interface JiraSearchResult {
  issues: JiraIssue[]
  total: number
  startAt: number
  maxResults: number
}

export class JiraClientService {
  private baseUrl: string
  private authHeader: string

  constructor(baseUrl: string, email: string, apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.authHeader = `Basic ${btoa(`${email}:${apiToken}`)}`
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}/rest/api/2${path}`
    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      })
    } catch {
      throw new Error(
        'Could not reach JIRA. If using an on-premise instance, ensure CORS is configured to allow requests from this domain, or check your VPN connection.',
      )
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`JIRA API error ${response.status}: ${text}`)
    }
    return response.json() as Promise<T>
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/myself')
      return true
    } catch {
      return false
    }
  }

  async getProjects(): Promise<JiraProject[]> {
    const projects = await this.request<JiraProject[]>('/project')
    return projects.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description,
    }))
  }

  async searchIssues(projectKey: string, startAt = 0, maxResults = 50): Promise<JiraSearchResult> {
    const jql = encodeURIComponent(`project=${projectKey} ORDER BY key ASC`)
    return this.request<JiraSearchResult>(
      `/search?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,description,status,priority,assignee,reporter`,
    )
  }

  async getAllIssues(
    projectKey: string,
    onProgress?: (fetched: number, total: number) => void,
  ): Promise<JiraIssue[]> {
    const allIssues: JiraIssue[] = []
    let startAt = 0
    let total = 0

    do {
      const result = await this.searchIssues(projectKey, startAt)
      total = result.total
      allIssues.push(...result.issues)
      startAt += result.maxResults
      onProgress?.(allIssues.length, total)
    } while (startAt < total)

    return allIssues
  }
}
