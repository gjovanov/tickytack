import { Deal, type IDeal } from 'db/src/models'
import { BaseDao } from '../base.dao'

class DealDao extends BaseDao<IDeal> {
  constructor() {
    super(Deal)
  }

  async findByPipeline(orgId: string, pipelineId: string): Promise<IDeal[]> {
    return this.model.find({ orgId, pipelineId }).sort({ createdAt: -1 }).exec()
  }

  async findByStage(orgId: string, stage: string): Promise<IDeal[]> {
    return this.model.find({ orgId, stage }).sort({ createdAt: -1 }).exec()
  }

  async findByAssignee(orgId: string, assigneeId: string): Promise<IDeal[]> {
    return this.model.find({ orgId, assigneeId }).sort({ createdAt: -1 }).exec()
  }

  async findByStatus(orgId: string, status: string): Promise<IDeal[]> {
    return this.model.find({ orgId, status }).sort({ createdAt: -1 }).exec()
  }

  async findByOrgId(orgId: string): Promise<IDeal[]> {
    return this.model.find({ orgId }).sort({ createdAt: -1 }).exec()
  }
}

export const dealDao = new DealDao()
