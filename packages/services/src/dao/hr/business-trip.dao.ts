import { BusinessTrip, type IBusinessTrip } from 'db/src/models'
import { BaseDao } from '../base.dao'

class BusinessTripDao extends BaseDao<IBusinessTrip> {
  constructor() {
    super(BusinessTrip)
  }

  async findByEmployee(orgId: string, employeeId: string): Promise<IBusinessTrip[]> {
    return this.model.find({ orgId, employeeId }).sort({ startDate: -1 }).exec()
  }

  async findByStatus(orgId: string, status: string): Promise<IBusinessTrip[]> {
    return this.model.find({ orgId, status }).sort({ startDate: -1 }).exec()
  }
}

export const businessTripDao = new BusinessTripDao()
