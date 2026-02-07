import { ExchangeRate, type IExchangeRate } from 'db/src/models'
import { BaseDao } from '../base.dao'

class ExchangeRateDao extends BaseDao<IExchangeRate> {
  constructor() {
    super(ExchangeRate)
  }

  async findRate(orgId: string, from: string, to: string, date: Date): Promise<IExchangeRate | null> {
    return this.model
      .findOne({ orgId, fromCurrency: from, toCurrency: to, date: { $lte: date } })
      .sort({ date: -1 })
      .exec()
  }

  async findByOrgId(orgId: string): Promise<IExchangeRate[]> {
    return this.model.find({ orgId }).sort({ date: -1 }).exec()
  }
}

export const exchangeRateDao = new ExchangeRateDao()
