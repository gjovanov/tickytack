import { Payslip, type IPayslip } from 'db/src/models'
import { BaseDao } from '../base.dao'

class PayslipDao extends BaseDao<IPayslip> {
  constructor() {
    super(Payslip)
  }

  async findByPayrollRun(orgId: string, payrollRunId: string): Promise<IPayslip[]> {
    return this.model.find({ orgId, payrollRunId }).populate('employeeId', 'firstName lastName employeeNumber').exec()
  }

  async findByEmployee(orgId: string, employeeId: string): Promise<IPayslip[]> {
    return this.model.find({ orgId, employeeId }).sort({ createdAt: -1 }).exec()
  }
}

export const payslipDao = new PayslipDao()
