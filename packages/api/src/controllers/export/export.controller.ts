import { Elysia, t } from 'elysia'
import { timeEntryDao } from 'services/src/dao'
import { generateTimesheetXLSX } from 'reporting/excel/timesheet.excel'
import { generateTimesheetPDF } from 'reporting/pdf/timesheet.pdf'

const exportBody = t.Object({
  startDate: t.String(),
  endDate: t.String(),
  locale: t.Optional(t.String()),
  userId: t.Optional(t.String()),
  descriptionOverrides: t.Optional(t.Record(t.String(), t.String())),
})

export const exportController = new Elysia({
  prefix: '/org/:orgId/export',
})
  .post(
    '/excel',
    async ({ params: { orgId }, body, user, set }) => {
      if (!user) throw new Error('Unauthorized')

      const startDate = new Date(body.startDate)
      const endDate = new Date(body.endDate)
      const locale = body.locale || 'en'

      const entries = await timeEntryDao.findByOrgAndDateRange(
        orgId,
        startDate,
        endDate,
        body.userId,
      )

      const buffer = await generateTimesheetXLSX(entries, {
        startDate,
        endDate,
        locale,
        userName: `${user.firstName} ${user.lastName}`,
      }, body.descriptionOverrides || {})

      if (!buffer) {
        throw new Error('No data to export')
      }

      set.headers['content-type'] =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      set.headers['content-disposition'] =
        `attachment; filename="timesheet-${body.startDate}-${body.endDate}.xlsx"`

      return buffer
    },
    { body: exportBody },
  )
  .post(
    '/pdf',
    async ({ params: { orgId }, body, user, set }) => {
      if (!user) throw new Error('Unauthorized')

      const startDate = new Date(body.startDate)
      const endDate = new Date(body.endDate)
      const locale = body.locale || 'en'

      const entries = await timeEntryDao.findByOrgAndDateRange(
        orgId,
        startDate,
        endDate,
        body.userId,
      )

      const buffer = await generateTimesheetPDF(entries, {
        startDate,
        endDate,
        locale,
        userName: `${user.firstName} ${user.lastName}`,
      }, body.descriptionOverrides || {})

      if (!buffer) {
        throw new Error('No data to export')
      }

      set.headers['content-type'] = 'application/pdf'
      set.headers['content-disposition'] =
        `attachment; filename="timesheet-${body.startDate}-${body.endDate}.pdf"`

      return buffer
    },
    { body: exportBody },
  )
