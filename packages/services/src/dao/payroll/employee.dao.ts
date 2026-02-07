import { Employee, type IEmployee } from 'db/src/models'
import { BaseDao } from '../base.dao'

class EmployeeDao extends BaseDao<IEmployee> {
  constructor() {
    super(Employee)
  }

  async findByOrgId(orgId: string): Promise<IEmployee[]> {
    return this.model.find({ orgId }).sort({ lastName: 1 }).exec()
  }

  async findByStatus(orgId: string, status: string): Promise<IEmployee[]> {
    return this.model.find({ orgId, status }).sort({ lastName: 1 }).exec()
  }

  async findByEmployeeNumber(orgId: string, employeeNumber: string): Promise<IEmployee | null> {
    return this.model.findOne({ orgId, employeeNumber }).exec()
  }
}

export const employeeDao = new EmployeeDao()
