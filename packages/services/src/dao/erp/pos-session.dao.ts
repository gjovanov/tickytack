import { PosSession, type IPosSession } from 'db/src/models'
import { BaseDao } from '../base.dao'

class PosSessionDao extends BaseDao<IPosSession> {
  constructor() {
    super(PosSession)
  }

  async getNextSessionNumber(orgId: string): Promise<string> {
    const last = await this.model
      .findOne({ orgId })
      .sort({ createdAt: -1 })
      .select('sessionNumber')
      .exec()
    if (!last) return 'POS-0001'
    const num = parseInt(last.sessionNumber.replace('POS-', ''), 10)
    return `POS-${String(num + 1).padStart(4, '0')}`
  }

  async findOpen(orgId: string): Promise<IPosSession[]> {
    return this.model.find({ orgId, status: 'open' }).exec()
  }

  async findByCashier(orgId: string, cashierId: string): Promise<IPosSession[]> {
    return this.model.find({ orgId, cashierId }).sort({ openedAt: -1 }).exec()
  }

  async findOpenByCashier(orgId: string, cashierId: string): Promise<IPosSession | null> {
    return this.model.findOne({ orgId, cashierId, status: 'open' }).exec()
  }
}

export const posSessionDao = new PosSessionDao()
