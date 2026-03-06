import type { Types } from 'mongoose'
import { ticketDao, timeEntryDao } from '../dao'
import type { ParsedTimesheetEntry } from 'reporting/excel/timesheet-import.excel'

export interface TimeEntryImportResult {
  imported: number
  replaced: number
  errors: Array<{ row: number; message: string }>
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export async function importTimeEntries(params: {
  orgId: string
  userId: string
  entries: ParsedTimesheetEntry[]
  replaceExisting: boolean
  startDate: string
  endDate: string
}): Promise<TimeEntryImportResult> {
  const { orgId, userId, entries, replaceExisting, startDate, endDate } = params
  const result: TimeEntryImportResult = { imported: 0, replaced: 0, errors: [] }

  // Resolve all unique ticket keys to their IDs
  const uniqueTicketKeys = [...new Set(entries.map((e) => e.ticketKey).filter(Boolean))]
  const ticketMap = new Map<string, { ticketId: string; projectId: string }>()

  for (const key of uniqueTicketKeys) {
    const ticket = await ticketDao.findByKeyAndOrg(key, orgId)
    if (!ticket) {
      // Collect all rows that reference this missing ticket
      const rows = entries
        .filter((e) => e.ticketKey === key)
        .map((e) => e.row)
      result.errors.push({
        row: rows[0],
        message: `Ticket "${key}" not found (referenced in rows: ${rows.join(', ')})`,
      })
    } else {
      ticketMap.set(key, {
        ticketId: String(ticket._id),
        projectId: String(ticket.projectId),
      })
    }
  }

  // Also validate entries without ticket key
  for (const entry of entries) {
    if (!entry.ticketKey) {
      result.errors.push({ row: entry.row, message: 'Missing ticket key' })
    }
  }

  // If there are errors, return early without importing
  if (result.errors.length) return result

  // Delete existing entries if replace mode
  if (replaceExisting) {
    result.replaced = await timeEntryDao.deleteByUserAndDateRange(
      orgId,
      userId,
      new Date(startDate),
      new Date(endDate),
    )
  }

  // Build time entry documents
  const docs = entries.map((entry) => {
    const ref = ticketMap.get(entry.ticketKey)!
    const startMinutes = parseTimeToMinutes(entry.startTime)
    const endMinutes = parseTimeToMinutes(entry.endTime)
    const durationMinutes = endMinutes - startMinutes

    return {
      orgId: orgId as unknown as Types.ObjectId,
      userId: userId as unknown as Types.ObjectId,
      ticketId: ref.ticketId as unknown as Types.ObjectId,
      projectId: ref.projectId as unknown as Types.ObjectId,
      date: new Date(entry.date),
      startTime: entry.startTime,
      endTime: entry.endTime,
      durationMinutes: durationMinutes > 0 ? durationMinutes : 0,
      description: entry.description || undefined,
    }
  })

  const created = await timeEntryDao.bulkCreate(docs)
  result.imported = created.length

  return result
}
