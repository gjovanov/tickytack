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

  async searchByKey(orgId: string, query: string): Promise<ITicket[]> {
    return this.model
      .find({
        orgId,
        $or: [
          { key: { $regex: query, $options: 'i' } },
          { summary: { $regex: query, $options: 'i' } },
        ],
      })
      .populate('projectId', 'name key color')
      .limit(20)
      .exec()
  }
}

export const ticketDao = new TicketDao()
