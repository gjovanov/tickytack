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
  subscription: {
    plan: string
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    status: string
    currentPeriodEnd?: Date
    cancelAtPeriodEnd: boolean
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
    subscription: {
      plan: { type: String, default: 'free' },
      stripeCustomerId: String,
      stripeSubscriptionId: String,
      status: { type: String, default: 'active' },
      currentPeriodEnd: Date,
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
)

export const Org = model<IOrg>('Org', orgSchema)
