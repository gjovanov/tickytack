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
      content: string // download URL
    }>
  }
}

export interface JiraSearchResult {
  issues: JiraIssue[]
  total: number
  startAt: number
  maxResults: number
}

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{ key: string; message: string }>
}
