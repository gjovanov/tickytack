import { PayrollRun, type IPayrollRun } from 'db/src/models'
import { BaseDao } from '../base.dao'

class PayrollRunDao extends BaseDao<IPayrollRun> {
  constructor() {
    super(PayrollRun)
  }

  async findByStatus(orgId: string, status: string): Promise<IPayrollRun[]> {
    return this.model.find({ orgId, status }).sort({ createdAt: -1 }).exec()
  }

  async findByPeriod(orgId: string, period: string): Promise<IPayrollRun | null> {
    return this.model.findOne({ orgId, period }).exec()
  }

  async findByOrgId(orgId: string): Promise<IPayrollRun[]> {
    return this.model.find({ orgId }).sort({ createdAt: -1 }).exec()
  }
}

export const payrollRunDao = new PayrollRunDao()
