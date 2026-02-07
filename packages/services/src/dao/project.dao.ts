import { Project, type IProject } from 'db/src/models'
import { BaseDao } from './base.dao'

class ProjectDao extends BaseDao<IProject> {
  constructor() {
    super(Project)
  }

  async findByOrgId(orgId: string): Promise<IProject[]> {
    return this.model.find({ orgId }).populate('leadId', 'firstName lastName').exec()
  }

  async findByKeyAndOrg(
    key: string,
    orgId: string,
  ): Promise<IProject | null> {
    return this.model.findOne({ key, orgId }).exec()
  }
}

export const projectDao = new ProjectDao()
