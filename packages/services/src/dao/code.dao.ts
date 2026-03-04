import { Code, type ICode } from 'db/src/models'
import { nanoid } from 'nanoid'
import { BaseDao } from './base.dao'

class CodeDaoClass extends BaseDao<ICode> {
  constructor() {
    super(Code)
  }

  async createActivationCode(userId: string, ttlMinutes: number): Promise<{ code: ICode; token: string }> {
    await this.model.deleteMany({ userId, type: 'user_activation' }).exec()
    const token = nanoid(7)
    const validTo = new Date(Date.now() + ttlMinutes * 60 * 1000)
    const code = await this.create({ userId, token, type: 'user_activation', validTo } as any)
    return { code, token }
  }

  async findActivationCode(userId: string, token: string): Promise<ICode | null> {
    return this.model.findOne({
      userId,
      token,
      type: 'user_activation',
      validTo: { $gt: new Date() },
    }).exec()
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.model.deleteMany({ userId, type: 'user_activation' }).exec()
  }
}

export const codeDao = new CodeDaoClass()
