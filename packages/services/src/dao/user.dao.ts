import { User, type IUser } from 'db/src/models'
import { BaseDao } from './base.dao'

class UserDao extends BaseDao<IUser> {
  constructor() {
    super(User)
  }

  async findByEmailAndOrg(
    email: string,
    orgId: string,
  ): Promise<IUser | null> {
    return this.model.findOne({ email, orgId }).exec()
  }

  async findByUsernameAndOrg(
    username: string,
    orgId: string,
  ): Promise<IUser | null> {
    return this.model.findOne({ username, orgId }).exec()
  }

  async findByUsernameAndOrgSlug(
    username: string,
    orgSlug: string,
  ): Promise<IUser | null> {
    const { Org } = await import('db/src/models')
    const org = await Org.findOne({ slug: orgSlug }).exec()
    if (!org) return null
    return this.model.findOne({ username, orgId: org._id }).exec()
  }

  async findByOrgId(orgId: string): Promise<IUser[]> {
    return this.model
      .find({ orgId })
      .select('-password')
      .exec()
  }
}

export const userDao = new UserDao()
