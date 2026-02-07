import { JournalEntry, type IJournalEntry } from 'db/src/models'
import { BaseDao } from '../base.dao'

class JournalEntryDao extends BaseDao<IJournalEntry> {
  constructor() {
    super(JournalEntry)
  }

  async getNextEntryNumber(orgId: string): Promise<string> {
    const last = await this.model
      .findOne({ orgId })
      .sort({ createdAt: -1 })
      .select('entryNumber')
      .exec()
    if (!last) return 'JE-0001'
    const num = parseInt(last.entryNumber.replace('JE-', ''), 10)
    return `JE-${String(num + 1).padStart(4, '0')}`
  }

  async findByStatus(orgId: string, status: string): Promise<IJournalEntry[]> {
    return this.model.find({ orgId, status }).sort({ date: -1 }).exec()
  }

  async findByDateRange(orgId: string, startDate: Date, endDate: Date): Promise<IJournalEntry[]> {
    return this.model
      .find({ orgId, date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .exec()
  }

  async findByAccount(orgId: string, accountId: string): Promise<IJournalEntry[]> {
    return this.model
      .find({ orgId, 'lines.accountId': accountId })
      .sort({ date: -1 })
      .exec()
  }
}

export const journalEntryDao = new JournalEntryDao()
