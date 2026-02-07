import { Activity, type IActivity } from 'db/src/models'
import { BaseDao } from '../base.dao'

class ActivityDao extends BaseDao<IActivity> {
  constructor() {
    super(Activity)
  }

  async findByLead(orgId: string, leadId: string): Promise<IActivity[]> {
    return this.model.find({ orgId, leadId }).sort({ date: -1 }).exec()
  }

  async findByDeal(orgId: string, dealId: string): Promise<IActivity[]> {
    return this.model.find({ orgId, dealId }).sort({ date: -1 }).exec()
  }

  async findByAssignee(orgId: string, assigneeId: string): Promise<IActivity[]> {
    return this.model.find({ orgId, assigneeId }).sort({ date: -1 }).exec()
  }

  async findByType(orgId: string, type: string): Promise<IActivity[]> {
    return this.model.find({ orgId, type }).sort({ date: -1 }).exec()
  }
}

export const activityDao = new ActivityDao()
