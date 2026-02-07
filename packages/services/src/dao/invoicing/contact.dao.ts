import { Contact, type IContact } from 'db/src/models'
import { BaseDao } from '../base.dao'

class ContactDao extends BaseDao<IContact> {
  constructor() {
    super(Contact)
  }

  async findByOrgId(orgId: string): Promise<IContact[]> {
    return this.model.find({ orgId, isActive: true }).sort({ name: 1 }).exec()
  }

  async findByType(orgId: string, type: string): Promise<IContact[]> {
    return this.model.find({ orgId, type, isActive: true }).sort({ name: 1 }).exec()
  }
}

export const contactDao = new ContactDao()
