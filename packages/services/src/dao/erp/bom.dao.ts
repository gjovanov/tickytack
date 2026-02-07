import { Bom, type IBom } from 'db/src/models'
import { BaseDao } from '../base.dao'

class BomDao extends BaseDao<IBom> {
  constructor() {
    super(Bom)
  }

  async findByProduct(orgId: string, productId: string): Promise<IBom[]> {
    return this.model.find({ orgId, productId, isActive: true }).exec()
  }

  async findByOrgId(orgId: string): Promise<IBom[]> {
    return this.model.find({ orgId, isActive: true }).populate('productId', 'name sku').exec()
  }
}

export const bomDao = new BomDao()
