import { Pipeline, type IPipeline } from 'db/src/models'
import { BaseDao } from '../base.dao'

class PipelineDao extends BaseDao<IPipeline> {
  constructor() {
    super(Pipeline)
  }

  async findByOrgId(orgId: string): Promise<IPipeline[]> {
    return this.model.find({ orgId }).exec()
  }

  async findDefault(orgId: string): Promise<IPipeline | null> {
    return this.model.findOne({ orgId, isDefault: true }).exec()
  }
}

export const pipelineDao = new PipelineDao()
