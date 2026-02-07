import { ProductionOrder, type IProductionOrder } from 'db/src/models'
import { BaseDao } from '../base.dao'

class ProductionOrderDao extends BaseDao<IProductionOrder> {
  constructor() {
    super(ProductionOrder)
  }

  async getNextOrderNumber(orgId: string): Promise<string> {
    const last = await this.model
      .findOne({ orgId })
      .sort({ createdAt: -1 })
      .select('orderNumber')
      .exec()
    if (!last) return 'PO-0001'
    const num = parseInt(last.orderNumber.replace('PO-', ''), 10)
    return `PO-${String(num + 1).padStart(4, '0')}`
  }

  async findByStatus(orgId: string, status: string): Promise<IProductionOrder[]> {
    return this.model.find({ orgId, status }).sort({ createdAt: -1 }).exec()
  }

  async findByProduct(orgId: string, productId: string): Promise<IProductionOrder[]> {
    return this.model.find({ orgId, productId }).sort({ createdAt: -1 }).exec()
  }

  async findActive(orgId: string): Promise<IProductionOrder[]> {
    return this.model.find({ orgId, status: { $in: ['planned', 'in_progress'] } }).exec()
  }
}

export const productionOrderDao = new ProductionOrderDao()
