import { Schema, model, type Document, type Types } from 'mongoose'

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export interface IAccount extends Document {
  code: string
  name: string
  type: AccountType
  parentId?: Types.ObjectId
  balance: number
  isActive: boolean
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const accountSchema = new Schema<IAccount>(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
      required: true,
    },
    parentId: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

accountSchema.index({ code: 1, orgId: 1 }, { unique: true })
accountSchema.index({ type: 1, orgId: 1 })

export const Account = model<IAccount>('Account', accountSchema)
