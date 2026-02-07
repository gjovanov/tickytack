import { Schema, model, type Document, type Types } from 'mongoose'

export type StockMovementType = 'receipt' | 'dispatch' | 'transfer' | 'adjustment'
export type StockMovementStatus = 'draft' | 'completed' | 'cancelled'

export interface IStockMovementLine {
  productId: Types.ObjectId
  quantity: number
  unitCost: number
}

export interface IStockMovement extends Document {
  movementNumber: string
  type: StockMovementType
  sourceWarehouseId?: Types.ObjectId
  destinationWarehouseId?: Types.ObjectId
  lines: IStockMovementLine[]
  status: StockMovementStatus
  date: Date
  reference?: string
  orgId: Types.ObjectId
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const stockMovementLineSchema = new Schema<IStockMovementLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
  },
  { _id: false },
)

const stockMovementSchema = new Schema<IStockMovement>(
  {
    movementNumber: { type: String, required: true },
    type: {
      type: String,
      enum: ['receipt', 'dispatch', 'transfer', 'adjustment'],
      required: true,
    },
    sourceWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    destinationWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    lines: [stockMovementLineSchema],
    status: {
      type: String,
      enum: ['draft', 'completed', 'cancelled'],
      default: 'draft',
    },
    date: { type: Date, required: true },
    reference: { type: String, default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

stockMovementSchema.index({ movementNumber: 1, orgId: 1 }, { unique: true })
stockMovementSchema.index({ type: 1, orgId: 1 })
stockMovementSchema.index({ status: 1, orgId: 1 })

export const StockMovement = model<IStockMovement>('StockMovement', stockMovementSchema)
