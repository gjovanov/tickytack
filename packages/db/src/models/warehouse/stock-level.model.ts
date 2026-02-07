import { Schema, model, type Document, type Types } from 'mongoose'

export interface IStockLevel extends Document {
  productId: Types.ObjectId
  warehouseId: Types.ObjectId
  quantity: number
  availableQty: number
  reservedQty: number
  avgCost: number
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const stockLevelSchema = new Schema<IStockLevel>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantity: { type: Number, default: 0 },
    availableQty: { type: Number, default: 0 },
    reservedQty: { type: Number, default: 0 },
    avgCost: { type: Number, default: 0 },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

stockLevelSchema.index({ productId: 1, warehouseId: 1, orgId: 1 }, { unique: true })

export const StockLevel = model<IStockLevel>('StockLevel', stockLevelSchema)
