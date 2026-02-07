import { Product, type IProduct } from 'db/src/models'
import { BaseDao } from '../base.dao'

class ProductDao extends BaseDao<IProduct> {
  constructor() {
    super(Product)
  }

  async findBySku(orgId: string, sku: string): Promise<IProduct | null> {
    return this.model.findOne({ orgId, sku }).exec()
  }

  async findByCategory(orgId: string, category: string): Promise<IProduct[]> {
    return this.model.find({ orgId, category, isActive: true }).exec()
  }

  async findByOrgId(orgId: string): Promise<IProduct[]> {
    return this.model.find({ orgId, isActive: true }).sort({ name: 1 }).exec()
  }
}

export const productDao = new ProductDao()
