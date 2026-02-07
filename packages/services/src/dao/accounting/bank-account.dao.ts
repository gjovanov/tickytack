import { BankAccount, type IBankAccount } from 'db/src/models'
import { BaseDao } from '../base.dao'

class BankAccountDao extends BaseDao<IBankAccount> {
  constructor() {
    super(BankAccount)
  }

  async findByOrgId(orgId: string): Promise<IBankAccount[]> {
    return this.model.find({ orgId }).exec()
  }

  async findByAccountNumber(orgId: string, accountNumber: string): Promise<IBankAccount | null> {
    return this.model.findOne({ orgId, accountNumber }).exec()
  }
}

export const bankAccountDao = new BankAccountDao()
