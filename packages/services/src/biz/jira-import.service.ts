import { mkdir } from 'fs/promises'
import { join } from 'path'
import type { Types } from 'mongoose'
import { config } from 'config/src'
import { projectDao, ticketDao, userDao } from '../dao'
import { JiraService } from './jira.service'
import type { JiraIssue } from './jira.types'
export type { ImportResult } from './jira.types'
import type { ImportResult } from './jira.types'
import { decrypt } from './crypto.service'
import type { TicketStatus, TicketPriority } from 'db/src/models'
import logger from '../logger/logger'

const STATUS_MAP: Record<string, TicketStatus> = {
  'to do': 'open',
  backlog: 'open',
  new: 'open',
  open: 'open',
  'in progress': 'in_progress',
  'in review': 'in_progress',
  done: 'done',
  resolved: 'done',
  closed: 'closed',
}

const PRIORITY_MAP: Record<string, TicketPriority> = {
  lowest: 'lowest',
  low: 'low',
  medium: 'medium',
  high: 'high',
  highest: 'highest',
  critical: 'highest',
  blocker: 'highest',
  minor: 'low',
  trivial: 'lowest',
  major: 'high',
}

function mapStatus(jiraStatus: string): TicketStatus {
  return STATUS_MAP[jiraStatus.toLowerCase()] || 'open'
}

function mapPriority(jiraPriority?: string): TicketPriority {
  if (!jiraPriority) return 'medium'
  return PRIORITY_MAP[jiraPriority.toLowerCase()] || 'medium'
}

function extractSequenceNumber(key: string): number {
  const match = key.match(/-(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

function createJiraService(
  encryptedToken: string,
  baseUrl: string,
  email: string,
): JiraService {
  const apiToken = decrypt(encryptedToken, config.jira.tokenEncryptionKey)
  return new JiraService(baseUrl, email, apiToken)
}

export async function importJiraProjects(
  orgId: string,
  userId: string,
  projectKeys: string[],
  jiraSettings: { jiraBaseUrl: string; jiraEmail: string; jiraApiToken: string },
): Promise<ImportResult> {
  const jira = createJiraService(
    jiraSettings.jiraApiToken,
    jiraSettings.jiraBaseUrl,
    jiraSettings.jiraEmail,
  )

  const jiraProjects = await jira.getProjects()
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }

  for (const key of projectKeys) {
    const jiraProject = jiraProjects.find((p) => p.key === key)
    if (!jiraProject) {
      result.errors.push({ key, message: 'Project not found in JIRA' })
      continue
    }

    const existing = await projectDao.findByKeyAndOrg(key, orgId)
    if (existing) {
      await projectDao.update(existing._id as string, {
        name: jiraProject.name,
        description: jiraProject.description || undefined,
        source: 'jira',
        sourceId: jiraProject.id,
      })
      result.updated++
    } else {
      await projectDao.create({
        name: jiraProject.name,
        key: jiraProject.key,
        description: jiraProject.description || undefined,
        orgId: orgId as unknown as Types.ObjectId,
        source: 'jira',
        sourceId: jiraProject.id,
        isActive: true,
      })
      result.created++
    }
  }

  return result
}

export async function importJiraIssues(
  orgId: string,
  userId: string,
  projectKey: string,
  jiraSettings: { jiraBaseUrl: string; jiraEmail: string; jiraApiToken: string },
  options: { includeAttachments?: boolean } = {},
): Promise<ImportResult> {
  const jira = createJiraService(
    jiraSettings.jiraApiToken,
    jiraSettings.jiraBaseUrl,
    jiraSettings.jiraEmail,
  )

  const project = await projectDao.findByKeyAndOrg(projectKey, orgId)
  if (!project) {
    return { created: 0, updated: 0, skipped: 0, errors: [{ key: projectKey, message: 'Project not found in TickyTack. Import the project first.' }] }
  }

  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }
  let startAt = 0
  let total = 0

  // Build a cache of org users by email for assignee matching
  const orgUsers = await userDao.findByOrgId(orgId)
  const usersByEmail = new Map(orgUsers.map((u) => [u.email.toLowerCase(), u]))

  do {
    const searchResult = await jira.searchIssues(projectKey, startAt)
    total = searchResult.total

    for (const issue of searchResult.issues) {
      try {
        await importSingleIssue(
          issue,
          orgId,
          userId,
          project._id as Types.ObjectId,
          usersByEmail,
          jira,
          options.includeAttachments || false,
        )
        const existing = await ticketDao.findByKeyAndOrg(issue.key, orgId)
        if (existing?.createdAt.getTime() === existing?.updatedAt.getTime()) {
          // Freshly created (upserted as new)
          result.created++
        } else {
          result.updated++
        }
      } catch (err: any) {
        logger.error(err, `Failed to import JIRA issue ${issue.key}`)
        result.errors.push({ key: issue.key, message: err.message })
      }
    }

    startAt += searchResult.maxResults
  } while (startAt < total)

  return result
}

async function importSingleIssue(
  issue: JiraIssue,
  orgId: string,
  fallbackReporterId: string,
  projectId: Types.ObjectId,
  usersByEmail: Map<string, any>,
  jira: JiraService,
  includeAttachments: boolean,
): Promise<void> {
  const assignee = issue.fields.assignee?.emailAddress
    ? usersByEmail.get(issue.fields.assignee.emailAddress.toLowerCase())
    : null
  const reporter = issue.fields.reporter?.emailAddress
    ? usersByEmail.get(issue.fields.reporter.emailAddress.toLowerCase())
    : null

  const ticketData: Record<string, unknown> = {
    key: issue.key,
    summary: issue.fields.summary,
    description: issue.fields.description || undefined,
    projectId,
    orgId: orgId as unknown as Types.ObjectId,
    assigneeId: assignee?._id || null,
    reporterId: reporter?._id || (fallbackReporterId as unknown as Types.ObjectId),
    status: mapStatus(issue.fields.status.name),
    priority: mapPriority(issue.fields.priority?.name),
    sequenceNumber: extractSequenceNumber(issue.key),
    source: 'jira' as const,
    sourceId: issue.id,
  }

  const existing = await ticketDao.findByKeyAndOrg(issue.key, orgId)
  let ticket: any

  if (existing) {
    // Don't overwrite reporterId on update
    delete ticketData.reporterId
    ticket = await ticketDao.update(existing._id as string, ticketData)
  } else {
    ticket = await ticketDao.create(ticketData as any)
  }

  // Handle attachments
  if (includeAttachments && issue.fields.attachment?.length && ticket) {
    const attachmentsDir = join(config.storage.attachmentsDir, orgId, issue.key)
    await mkdir(attachmentsDir, { recursive: true })

    const attachments = []
    for (const att of issue.fields.attachment) {
      try {
        const buffer = await jira.downloadAttachment(att.content)
        const filePath = join(attachmentsDir, att.filename)
        await Bun.write(filePath, buffer)
        attachments.push({
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
          storagePath: filePath,
          sourceUrl: att.content,
          createdAt: new Date(),
        })
      } catch (err: any) {
        logger.warn(err, `Failed to download attachment ${att.filename} for ${issue.key}`)
      }
    }

    if (attachments.length) {
      await ticketDao.update(ticket._id as string, { attachments } as any)
    }
  }
}
