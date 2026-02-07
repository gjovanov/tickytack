import { StockLevel, type IStockLevel } from 'db/src/models'
import { BaseDao } from '../base.dao'

class StockLevelDao extends BaseDao<IStockLevel> {
  constructor() {
    super(StockLevel)
  }

  async findByProduct(orgId: string, productId: string): Promise<IStockLevel[]> {
    return this.model.find({ orgId, productId }).populate('warehouseId', 'name code').exec()
  }

  async findByWarehouse(orgId: string, warehouseId: string): Promise<IStockLevel[]> {
    return this.model.find({ orgId, warehouseId }).populate('productId', 'name sku').exec()
  }

  async findByProductAndWarehouse(orgId: string, productId: string, warehouseId: string): Promise<IStockLevel | null> {
    return this.model.findOne({ orgId, productId, warehouseId }).exec()
  }
}

export const stockLevelDao = new StockLevelDao()
