import { Schema, model, type Document, type Types } from 'mongoose'

export interface IBankAccount extends Document {
  name: string
  bankName: string
  accountNumber: string
  currency: string
  balance: number
  accountId: Types.ObjectId
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const bankAccountSchema = new Schema<IBankAccount>(
  {
    name: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    currency: { type: String, default: 'EUR' },
    balance: { type: Number, default: 0 },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

bankAccountSchema.index({ accountNumber: 1, orgId: 1 }, { unique: true })

export const BankAccount = model<IBankAccount>('BankAccount', bankAccountSchema)
