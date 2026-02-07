import { Schema, model, type Document, type Types } from 'mongoose'

export type PosSessionStatus = 'open' | 'closed'

export interface IPosSession extends Document {
  sessionNumber: string
  warehouseId: Types.ObjectId
  cashierId: Types.ObjectId
  openingBalance: number
  closingBalance: number
  expectedBalance: number
  difference: number
  totalSales: number
  totalReturns: number
  totalCash: number
  totalCard: number
  transactionCount: number
  status: PosSessionStatus
  openedAt: Date
  closedAt?: Date
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const posSessionSchema = new Schema<IPosSession>(
  {
    sessionNumber: { type: String, required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    openingBalance: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },
    expectedBalance: { type: Number, default: 0 },
    difference: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalReturns: { type: Number, default: 0 },
    totalCash: { type: Number, default: 0 },
    totalCard: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    openedAt: { type: Date, required: true },
    closedAt: { type: Date, default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

posSessionSchema.index({ sessionNumber: 1, orgId: 1 }, { unique: true })
posSessionSchema.index({ cashierId: 1, status: 1, orgId: 1 })

export const PosSession = model<IPosSession>('PosSession', posSessionSchema)
