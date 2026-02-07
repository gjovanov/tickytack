import { Schema, model, type Document, type Types } from 'mongoose'

export interface IOrg extends Document {
  name: string
  slug: string
  description?: string
  ownerId: Types.ObjectId
  settings: {
    weekStartsOn: number
    workingHoursPerDay: number
  }
  createdAt: Date
  updatedAt: Date
}

const orgSchema = new Schema<IOrg>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    settings: {
      weekStartsOn: { type: Number, default: 1 },
      workingHoursPerDay: { type: Number, default: 8 },
    },
  },
  { timestamps: true },
)

export const Org = model<IOrg>('Org', orgSchema)
