import { Lead, type ILead } from 'db/src/models'
import { BaseDao } from '../base.dao'

class LeadDao extends BaseDao<ILead> {
  constructor() {
    super(Lead)
  }

  async findByStatus(orgId: string, status: string): Promise<ILead[]> {
    return this.model.find({ orgId, status }).sort({ createdAt: -1 }).exec()
  }

  async findByAssignee(orgId: string, assigneeId: string): Promise<ILead[]> {
    return this.model.find({ orgId, assigneeId }).sort({ createdAt: -1 }).exec()
  }

  async findByOrgId(orgId: string): Promise<ILead[]> {
    return this.model.find({ orgId }).sort({ createdAt: -1 }).exec()
  }
}

export const leadDao = new LeadDao()
