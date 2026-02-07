import { Department, type IDepartment } from 'db/src/models'
import { BaseDao } from '../base.dao'

class DepartmentDao extends BaseDao<IDepartment> {
  constructor() {
    super(Department)
  }

  async findByOrgId(orgId: string): Promise<IDepartment[]> {
    return this.model.find({ orgId }).sort({ name: 1 }).exec()
  }

  async findByCode(orgId: string, code: string): Promise<IDepartment | null> {
    return this.model.findOne({ orgId, code }).exec()
  }
}

export const departmentDao = new DepartmentDao()
