import { DataDeletionRequest, type IDataDeletionRequest } from 'db/src/models'
import { BaseDao } from './base.dao'

class DataDeletionRequestDao extends BaseDao<IDataDeletionRequest> {
  constructor() {
    super(DataDeletionRequest)
  }

  async findByConfirmationCode(code: string): Promise<IDataDeletionRequest | null> {
    return this.model.findOne({ confirmationCode: code }).exec()
  }
}

export const dataDeletionRequestDao = new DataDeletionRequestDao()
