import { Schema, model, type Document, type Types } from 'mongoose'

export type PosTransactionType = 'sale' | 'return'

export interface IPosTransactionLine {
  productId: Types.ObjectId
  quantity: number
  unitPrice: number
  discount: number
  lineTotal: number
}

export interface IPosTransaction extends Document {
  transactionNumber: string
  sessionId: Types.ObjectId
  type: PosTransactionType
  lines: IPosTransactionLine[]
  subtotal: number
  taxTotal: number
  total: number
  paymentMethod: string
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const posTransactionLineSchema = new Schema<IPosTransactionLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
)

const posTransactionSchema = new Schema<IPosTransaction>(
  {
    transactionNumber: { type: String, required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'PosSession', required: true },
    type: {
      type: String,
      enum: ['sale', 'return'],
      default: 'sale',
    },
    lines: [posTransactionLineSchema],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

posTransactionSchema.index({ transactionNumber: 1, orgId: 1 }, { unique: true })
posTransactionSchema.index({ sessionId: 1, orgId: 1 })

export const PosTransaction = model<IPosTransaction>('PosTransaction', posTransactionSchema)
