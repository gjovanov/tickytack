import { Account, type IAccount } from 'db/src/models'
import { BaseDao } from '../base.dao'

class AccountDao extends BaseDao<IAccount> {
  constructor() {
    super(Account)
  }

  async findByCode(orgId: string, code: string): Promise<IAccount | null> {
    return this.model.findOne({ orgId, code }).exec()
  }

  async findByType(orgId: string, type: string): Promise<IAccount[]> {
    return this.model.find({ orgId, type }).exec()
  }

  async findByOrgId(orgId: string): Promise<IAccount[]> {
    return this.model.find({ orgId, isActive: true }).sort({ code: 1 }).exec()
  }
}

export const accountDao = new AccountDao()
