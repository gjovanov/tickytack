import { Ticket, type ITicket } from 'db/src/models'
import { BaseDao } from './base.dao'

class TicketDao extends BaseDao<ITicket> {
  constructor() {
    super(Ticket)
  }

  async findByOrgId(orgId: string, projectId?: string): Promise<ITicket[]> {
    const filter: Record<string, string> = { orgId }
    if (projectId) filter.projectId = projectId
    return this.model
      .find(filter)
      .populate('assigneeId', 'firstName lastName')
      .populate('reporterId', 'firstName lastName')
      .populate('projectId', 'name key color')
      .exec()
  }

  async getNextSequenceNumber(projectId: string): Promise<number> {
    const lastTicket = await this.model
      .findOne({ projectId })
      .sort({ sequenceNumber: -1 })
      .select('sequenceNumber')
      .exec()
    return lastTicket ? lastTicket.sequenceNumber + 1 : 100
  }

  async findByKeyAndOrg(key: string, orgId: string): Promise<ITicket | null> {
    return this.model.findOne({ key, orgId }).exec()
  }

  async bulkUpsertByKey(
    orgId: string,
    tickets: Array<Partial<ITicket> & { key: string }>,
  ): Promise<{ upsertedCount: number; modifiedCount: number }> {
    if (!tickets.length) return { upsertedCount: 0, modifiedCount: 0 }
    const ops = tickets.map((t) => ({
      updateOne: {
        filter: { key: t.key, orgId },
        update: { $set: { ...t, orgId } },
        upsert: true,
      },
    }))
    const result = await this.model.bulkWrite(ops)
    return {
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
    }
  }

  async searchByKey(orgId: string, query: string): Promise<ITicket[]> {
    const filter: Record<string, unknown> = { orgId }
    if (query) {
      filter.$or = [
        { key: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } },
      ]
    }
    return this.model
      .find(filter)
      .select('key summary projectId status priority')
      .populate('projectId', 'name key color')
      .sort({ key: 1 })
      .limit(20)
      .lean()
      .exec()
  }
}

export const ticketDao = new TicketDao()
