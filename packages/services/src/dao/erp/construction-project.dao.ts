import { ConstructionProject, type IConstructionProject } from 'db/src/models'
import { BaseDao } from '../base.dao'

class ConstructionProjectDao extends BaseDao<IConstructionProject> {
  constructor() {
    super(ConstructionProject)
  }

  async findByCode(orgId: string, code: string): Promise<IConstructionProject | null> {
    return this.model.findOne({ orgId, code }).exec()
  }

  async findByStatus(orgId: string, status: string): Promise<IConstructionProject[]> {
    return this.model.find({ orgId, status }).sort({ startDate: -1 }).exec()
  }

  async findByOrgId(orgId: string): Promise<IConstructionProject[]> {
    return this.model.find({ orgId }).sort({ createdAt: -1 }).exec()
  }
}

export const constructionProjectDao = new ConstructionProjectDao()
