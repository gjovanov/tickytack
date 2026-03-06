import { Elysia, t } from 'elysia'
import UnauthorizedError from '../../errors/UnauthorizedError'
import BadRequestError from '../../errors/BadRequestError'
import { parseTimesheetXLSX } from 'reporting/excel/timesheet-import.excel'
import { importTimeEntries } from 'services/src/biz/timeentry-import.service'
import { timeEntryDao } from 'services/src/dao'

export const importController = new Elysia({
  prefix: '/org/:orgId/import',
})
  .post(
    '/excel/preview',
    async ({ params: { orgId }, body, user }) => {
      if (!user) throw new UnauthorizedError()

      const file = body.file
      if (!file) throw new BadRequestError('No file provided')

      const buffer = Buffer.from(await file.arrayBuffer())

      try {
        const parsed = await parseTimesheetXLSX(buffer)

        // Count existing entries for the period
        const existingCount = await timeEntryDao.countByUserAndDateRange(
          orgId,
          user.id,
          new Date(parsed.startDate),
          new Date(parsed.endDate),
        )

        return { ...parsed, existingCount }
      } catch (err: any) {
        throw new BadRequestError(err.message || 'Failed to parse Excel file')
      }
    },
    {
      body: t.Object({
        file: t.File({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      }),
    },
  )
  .post(
    '/excel',
    async ({ params: { orgId }, body, user }) => {
      if (!user) throw new UnauthorizedError()

      const file = body.file
      if (!file) throw new BadRequestError('No file provided')

      const buffer = Buffer.from(await file.arrayBuffer())
      const replaceExisting = body.replaceExisting === 'true'

      try {
        const parsed = await parseTimesheetXLSX(buffer)
        const result = await importTimeEntries({
          orgId,
          userId: user.id,
          entries: parsed.entries,
          replaceExisting,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
        })
        return result
      } catch (err: any) {
        throw new BadRequestError(err.message || 'Import failed')
      }
    },
    {
      body: t.Object({
        file: t.File({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        replaceExisting: t.Optional(t.String()),
      }),
    },
  )
