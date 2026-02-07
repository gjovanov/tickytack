import { FiscalYear, type IFiscalYear } from 'db/src/models'
import { BaseDao } from '../base.dao'

class FiscalYearDao extends BaseDao<IFiscalYear> {
  constructor() {
    super(FiscalYear)
  }

  async findByOrgId(orgId: string): Promise<IFiscalYear[]> {
    return this.model.find({ orgId }).sort({ startDate: -1 }).exec()
  }

  async findActive(orgId: string): Promise<IFiscalYear | null> {
    return this.model.findOne({ orgId, isClosed: false }).exec()
  }
}

export const fiscalYearDao = new FiscalYearDao()
