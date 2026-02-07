import { TimeEntry, type ITimeEntry } from 'db/src/models'
import { BaseDao } from './base.dao'

export interface TimeEntrySummary {
  date: string
  totalMinutes: number
  entries: number
}

class TimeEntryDao extends BaseDao<ITimeEntry> {
  constructor() {
    super(TimeEntry)
  }

  async findByUserAndDateRange(
    orgId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ITimeEntry[]> {
    return this.model
      .find({
        orgId,
        userId,
        date: { $gte: startDate, $lte: endDate },
      })
      .populate('ticketId', 'key summary')
      .populate('projectId', 'name key color')
      .sort({ date: 1, startTime: 1 })
      .exec()
  }

  async findByOrgAndDateRange(
    orgId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<ITimeEntry[]> {
    const filter: Record<string, unknown> = {
      orgId,
      date: { $gte: startDate, $lte: endDate },
    }
    if (userId) filter.userId = userId
    return this.model
      .find(filter)
      .populate('userId', 'firstName lastName email')
      .populate('ticketId', 'key summary')
      .populate('projectId', 'name key color')
      .sort({ date: 1, startTime: 1 })
      .exec()
  }

  async getSummaryByDateRange(
    orgId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<TimeEntrySummary[]> {
    const match: Record<string, unknown> = {
      orgId: { $toObjectId: orgId },
      date: { $gte: startDate, $lte: endDate },
    }
    if (userId) match.userId = { $toObjectId: userId }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalMinutes: { $sum: '$durationMinutes' },
          entries: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalMinutes: 1,
          entries: 1,
        },
      },
      { $sort: { date: 1 as const } },
    ]

    return this.model.aggregate(pipeline).exec()
  }
}

export const timeEntryDao = new TimeEntryDao()
