import { PriceList, type IPriceList } from 'db/src/models'
import { BaseDao } from '../base.dao'

class PriceListDao extends BaseDao<IPriceList> {
  constructor() {
    super(PriceList)
  }

  async findByOrgId(orgId: string): Promise<IPriceList[]> {
    return this.model.find({ orgId, isActive: true }).sort({ name: 1 }).exec()
  }
}

export const priceListDao = new PriceListDao()
