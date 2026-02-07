import { FiscalPeriod, type IFiscalPeriod } from 'db/src/models'
import { BaseDao } from '../base.dao'

class FiscalPeriodDao extends BaseDao<IFiscalPeriod> {
  constructor() {
    super(FiscalPeriod)
  }

  async findByFiscalYear(orgId: string, fiscalYearId: string): Promise<IFiscalPeriod[]> {
    return this.model.find({ orgId, fiscalYearId }).sort({ startDate: 1 }).exec()
  }
}

export const fiscalPeriodDao = new FiscalPeriodDao()
