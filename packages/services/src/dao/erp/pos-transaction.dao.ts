import { PosTransaction, type IPosTransaction } from 'db/src/models'
import { BaseDao } from '../base.dao'

class PosTransactionDao extends BaseDao<IPosTransaction> {
  constructor() {
    super(PosTransaction)
  }

  async getNextTransactionNumber(orgId: string): Promise<string> {
    const last = await this.model
      .findOne({ orgId })
      .sort({ createdAt: -1 })
      .select('transactionNumber')
      .exec()
    if (!last) return 'TXN-0001'
    const num = parseInt(last.transactionNumber.replace('TXN-', ''), 10)
    return `TXN-${String(num + 1).padStart(4, '0')}`
  }

  async findBySession(orgId: string, sessionId: string): Promise<IPosTransaction[]> {
    return this.model.find({ orgId, sessionId }).sort({ createdAt: 1 }).exec()
  }
}

export const posTransactionDao = new PosTransactionDao()
