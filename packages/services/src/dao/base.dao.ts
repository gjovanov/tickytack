import type { Model, Document, FilterQuery, Types } from 'mongoose'

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export class BaseDao<T extends Document> {
  constructor(protected model: Model<T>) {}

  async findById(id: string | Types.ObjectId): Promise<T | null> {
    return this.model.findById(id).exec()
  }

  async findAll(
    filter: FilterQuery<T> = {},
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.model.find(filter).skip(skip).limit(pageSize).exec(),
      this.model.countDocuments(filter).exec(),
    ])
    return { data, total, page, pageSize }
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data) as Promise<T>
  }

  async update(
    id: string | Types.ObjectId,
    data: Partial<T>,
  ): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec()
  }

  async delete(id: string | Types.ObjectId): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec()
  }
}
