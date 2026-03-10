import { Elysia, t } from 'elysia'
import UnauthorizedError from '../../errors/UnauthorizedError'
import BadRequestError from '../../errors/BadRequestError'
import NotFoundError from '../../errors/NotFoundError'
import { userDao } from 'services/src/dao'
import { encrypt, decrypt } from 'services/src/biz/crypto.service'
import { JiraService } from 'services/src/biz/jira.service'
import { importJiraProjects, importJiraIssues, importJiraProjectsFromData, importJiraIssuesFromData } from 'services/src/biz/jira-import.service'
import { config } from 'config/src'

async function getUserJiraSettings(userId: string) {
  const user = await userDao.findById(userId)
  if (!user?.jiraSettings) {
    throw new BadRequestError('JIRA settings not configured. Please set up your JIRA connection first.')
  }
  return user.jiraSettings
}

function createJiraServiceFromSettings(settings: {
  jiraBaseUrl: string
  jiraEmail: string
  jiraApiToken: string
}) {
  const apiToken = decrypt(settings.jiraApiToken, config.jira.tokenEncryptionKey)
  return new JiraService(settings.jiraBaseUrl, settings.jiraEmail, apiToken)
}

export const jiraController = new Elysia({ prefix: '/org/:orgId/jira' })
  // JIRA Settings
  .get('/settings', async ({ params: { orgId }, user }) => {
    if (!user) throw new UnauthorizedError()
    const dbUser = await userDao.findById(user.id)
    if (!dbUser) throw new NotFoundError('User not found')

    if (!dbUser.jiraSettings) {
      return { jiraBaseUrl: '', jiraEmail: '', hasToken: false }
    }

    return {
      jiraBaseUrl: dbUser.jiraSettings.jiraBaseUrl,
      jiraEmail: dbUser.jiraSettings.jiraEmail,
      hasToken: true,
    }
  })
  .put(
    '/settings',
    async ({ params: { orgId }, body, user }) => {
      if (!user) throw new UnauthorizedError()

      const encryptedToken = encrypt(body.jiraApiToken, config.jira.tokenEncryptionKey)
      await userDao.update(user.id, {
        jiraSettings: {
          jiraBaseUrl: body.jiraBaseUrl,
          jiraEmail: body.jiraEmail,
          jiraApiToken: encryptedToken,
        },
      } as any)

      return { message: 'JIRA settings saved' }
    },
    {
      body: t.Object({
        jiraBaseUrl: t.String({ minLength: 1 }),
        jiraEmail: t.String({ format: 'email' }),
        jiraApiToken: t.String({ minLength: 1 }),
      }),
    },
  )
  .post('/settings/test', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    const settings = await getUserJiraSettings(user.id)
    const jira = createJiraServiceFromSettings(settings)
    const connected = await jira.testConnection()
    if (!connected) {
      throw new BadRequestError('Failed to connect to JIRA. Check your credentials and URL.')
    }
    return { connected: true }
  })
  // JIRA Projects (browse from JIRA)
  .get('/projects', async ({ user }) => {
    if (!user) throw new UnauthorizedError()
    const settings = await getUserJiraSettings(user.id)
    const jira = createJiraServiceFromSettings(settings)
    return jira.getProjects()
  })
  // Import projects
  .post(
    '/import/projects',
    async ({ params: { orgId }, body, user }) => {
      if (!user) throw new UnauthorizedError()
      const settings = await getUserJiraSettings(user.id)
      return importJiraProjects(orgId, user.id, body.projectKeys, settings)
    },
    {
      body: t.Object({
        projectKeys: t.Array(t.String()),
      }),
    },
  )
  // Import issues for a project
  .post(
    '/import/issues',
    async ({ params: { orgId }, body, user }) => {
      if (!user) throw new UnauthorizedError()
      const settings = await getUserJiraSettings(user.id)
      return importJiraIssues(orgId, user.id, body.projectKey, settings, {
        includeAttachments: body.includeAttachments ?? false,
      })
    },
    {
      body: t.Object({
        projectKey: t.String(),
        includeAttachments: t.Optional(t.Boolean()),
      }),
    },
  )
  // Client-side import: accept pre-fetched JIRA project data
  .post(
    '/import/projects-data',
    async ({ params: { orgId }, body, user }) => {
      if (!user) throw new UnauthorizedError()
      return importJiraProjectsFromData(orgId, user.id, body.projects)
    },
    {
      body: t.Object({
        projects: t.Array(
          t.Object({
            id: t.String(),
            key: t.String(),
            name: t.String(),
            description: t.Optional(t.String()),
          }),
        ),
      }),
    },
  )
  // Client-side import: accept pre-fetched JIRA issue data
  .post(
    '/import/issues-data',
    async ({ params: { orgId }, body, user }) => {
      if (!user) throw new UnauthorizedError()
      return importJiraIssuesFromData(orgId, user.id, body.projectKey, body.issues)
    },
    {
      body: t.Object({
        projectKey: t.String(),
        issues: t.Array(
          t.Object({
            id: t.String(),
            key: t.String(),
            fields: t.Object({
              summary: t.String(),
              description: t.Optional(t.String()),
              status: t.Object({ name: t.String() }),
              priority: t.Optional(t.Object({ name: t.String() })),
              assignee: t.Optional(
                t.Object({
                  emailAddress: t.String(),
                  displayName: t.String(),
                }),
              ),
              reporter: t.Optional(
                t.Object({
                  emailAddress: t.String(),
                  displayName: t.String(),
                }),
              ),
            }),
          }),
        ),
      }),
    },
  )
