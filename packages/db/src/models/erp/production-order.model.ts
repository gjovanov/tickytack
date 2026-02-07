import { Schema, model, type Document, type Types } from 'mongoose'

export type ProductionOrderStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface IProductionOrder extends Document {
  orderNumber: string
  bomId: Types.ObjectId
  productId: Types.ObjectId
  quantity: number
  warehouseId: Types.ObjectId
  status: ProductionOrderStatus
  plannedStartDate: Date
  actualStartDate?: Date
  completedDate?: Date
  orgId: Types.ObjectId
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const productionOrderSchema = new Schema<IProductionOrder>(
  {
    orderNumber: { type: String, required: true },
    bomId: { type: Schema.Types.ObjectId, ref: 'Bom', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    plannedStartDate: { type: Date, required: true },
    actualStartDate: { type: Date, default: null },
    completedDate: { type: Date, default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

productionOrderSchema.index({ orderNumber: 1, orgId: 1 }, { unique: true })
productionOrderSchema.index({ status: 1, orgId: 1 })
productionOrderSchema.index({ productId: 1, orgId: 1 })

export const ProductionOrder = model<IProductionOrder>('ProductionOrder', productionOrderSchema)
