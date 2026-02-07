import { ErpTimesheet, type IErpTimesheet } from 'db/src/models'
import { BaseDao } from '../base.dao'

class ErpTimesheetDao extends BaseDao<IErpTimesheet> {
  constructor() {
    super(ErpTimesheet)
  }

  async findByEmployee(orgId: string, employeeId: string): Promise<IErpTimesheet[]> {
    return this.model.find({ orgId, employeeId }).sort({ period: -1 }).exec()
  }

  async findByPeriod(orgId: string, period: string): Promise<IErpTimesheet[]> {
    return this.model.find({ orgId, period }).exec()
  }
}

export const erpTimesheetDao = new ErpTimesheetDao()
