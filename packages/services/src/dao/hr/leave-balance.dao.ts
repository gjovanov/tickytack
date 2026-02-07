import { LeaveBalance, type ILeaveBalance } from 'db/src/models'
import { BaseDao } from '../base.dao'

class LeaveBalanceDao extends BaseDao<ILeaveBalance> {
  constructor() {
    super(LeaveBalance)
  }

  async findByEmployee(orgId: string, employeeId: string, year?: number): Promise<ILeaveBalance[]> {
    const filter: Record<string, unknown> = { orgId, employeeId }
    if (year) filter.year = year
    return this.model.find(filter).populate('leaveTypeId', 'name code').exec()
  }

  async findByLeaveType(orgId: string, leaveTypeId: string, year: number): Promise<ILeaveBalance[]> {
    return this.model.find({ orgId, leaveTypeId, year }).exec()
  }

  async findOne(orgId: string, employeeId: string, leaveTypeId: string, year: number): Promise<ILeaveBalance | null> {
    return this.model.findOne({ orgId, employeeId, leaveTypeId, year }).exec()
  }
}

export const leaveBalanceDao = new LeaveBalanceDao()
