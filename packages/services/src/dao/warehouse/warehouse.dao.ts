import { Warehouse, type IWarehouse } from 'db/src/models'
import { BaseDao } from '../base.dao'

class WarehouseDao extends BaseDao<IWarehouse> {
  constructor() {
    super(Warehouse)
  }

  async findByCode(orgId: string, code: string): Promise<IWarehouse | null> {
    return this.model.findOne({ orgId, code }).exec()
  }

  async findByOrgId(orgId: string): Promise<IWarehouse[]> {
    return this.model.find({ orgId, isActive: true }).sort({ name: 1 }).exec()
  }
}

export const warehouseDao = new WarehouseDao()
