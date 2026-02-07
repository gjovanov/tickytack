import { LeaveRequest, type ILeaveRequest } from 'db/src/models'
import { BaseDao } from '../base.dao'

class LeaveRequestDao extends BaseDao<ILeaveRequest> {
  constructor() {
    super(LeaveRequest)
  }

  async findByEmployee(orgId: string, employeeId: string): Promise<ILeaveRequest[]> {
    return this.model.find({ orgId, employeeId }).sort({ startDate: -1 }).exec()
  }

  async findByLeaveType(orgId: string, leaveTypeId: string): Promise<ILeaveRequest[]> {
    return this.model.find({ orgId, leaveTypeId }).sort({ startDate: -1 }).exec()
  }

  async findByStatus(orgId: string, status: string): Promise<ILeaveRequest[]> {
    return this.model.find({ orgId, status }).sort({ startDate: -1 }).exec()
  }
}

export const leaveRequestDao = new LeaveRequestDao()
