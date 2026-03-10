import logger from '../logger/logger'
export type { JiraProject, JiraIssue, JiraSearchResult } from './jira.types'
import type { JiraProject, JiraSearchResult } from './jira.types'

export class JiraService {
  private baseUrl: string
  private authHeader: string

  constructor(baseUrl: string, email: string, apiToken: string) {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}/rest/api/2${path}`
    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    })
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
    } catch (err) {
      logger.error(err, 'JIRA connection test failed')
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

  async searchIssues(
    projectKey: string,
    startAt = 0,
    maxResults = 50,
  ): Promise<JiraSearchResult> {
    const jql = encodeURIComponent(`project=${projectKey} ORDER BY key ASC`)
    return this.request<JiraSearchResult>(
      `/search?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,description,status,priority,assignee,reporter,attachment`,
    )
  }

  async downloadAttachment(url: string): Promise<Buffer> {
    const response = await fetch(url, {
      headers: { Authorization: this.authHeader },
    })
    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.status}`)
    }
    return Buffer.from(await response.arrayBuffer())
  }
}
