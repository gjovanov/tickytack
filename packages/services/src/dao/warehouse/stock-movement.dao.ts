import { StockMovement, type IStockMovement } from 'db/src/models'
import { BaseDao } from '../base.dao'

class StockMovementDao extends BaseDao<IStockMovement> {
  constructor() {
    super(StockMovement)
  }

  async getNextMovementNumber(orgId: string): Promise<string> {
    const last = await this.model
      .findOne({ orgId })
      .sort({ createdAt: -1 })
      .select('movementNumber')
      .exec()
    if (!last) return 'SM-0001'
    const num = parseInt(last.movementNumber.replace('SM-', ''), 10)
    return `SM-${String(num + 1).padStart(4, '0')}`
  }

  async findByStatus(orgId: string, status: string): Promise<IStockMovement[]> {
    return this.model.find({ orgId, status }).sort({ date: -1 }).exec()
  }

  async findByType(orgId: string, type: string): Promise<IStockMovement[]> {
    return this.model.find({ orgId, type }).sort({ date: -1 }).exec()
  }

  async findByDateRange(orgId: string, startDate: Date, endDate: Date): Promise<IStockMovement[]> {
    return this.model
      .find({ orgId, date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1 })
      .exec()
  }
}

export const stockMovementDao = new StockMovementDao()
