import { EmployeeDocument, type IEmployeeDocument } from 'db/src/models'
import { BaseDao } from '../base.dao'

class EmployeeDocumentDao extends BaseDao<IEmployeeDocument> {
  constructor() {
    super(EmployeeDocument)
  }

  async findByEmployee(orgId: string, employeeId: string): Promise<IEmployeeDocument[]> {
    return this.model.find({ orgId, employeeId }).sort({ createdAt: -1 }).exec()
  }
}

export const employeeDocumentDao = new EmployeeDocumentDao()
