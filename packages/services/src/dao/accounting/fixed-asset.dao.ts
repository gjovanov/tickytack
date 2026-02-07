import { FixedAsset, type IFixedAsset } from 'db/src/models'
import { BaseDao } from '../base.dao'

class FixedAssetDao extends BaseDao<IFixedAsset> {
  constructor() {
    super(FixedAsset)
  }

  async findByCode(orgId: string, code: string): Promise<IFixedAsset | null> {
    return this.model.findOne({ orgId, code }).exec()
  }

  async findByStatus(orgId: string, status: string): Promise<IFixedAsset[]> {
    return this.model.find({ orgId, status }).exec()
  }

  async findByOrgId(orgId: string): Promise<IFixedAsset[]> {
    return this.model.find({ orgId }).sort({ code: 1 }).exec()
  }
}

export const fixedAssetDao = new FixedAssetDao()
