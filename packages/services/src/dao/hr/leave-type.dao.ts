import { LeaveType, type ILeaveType } from 'db/src/models'
import { BaseDao } from '../base.dao'

class LeaveTypeDao extends BaseDao<ILeaveType> {
  constructor() {
    super(LeaveType)
  }

  async findByOrgId(orgId: string): Promise<ILeaveType[]> {
    return this.model.find({ orgId }).sort({ name: 1 }).exec()
  }

  async findByCode(orgId: string, code: string): Promise<ILeaveType | null> {
    return this.model.findOne({ orgId, code }).exec()
  }
}

export const leaveTypeDao = new LeaveTypeDao()
