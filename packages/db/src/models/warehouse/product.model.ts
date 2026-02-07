import { Schema, model, type Document, type Types } from 'mongoose'

export interface IProduct extends Document {
  name: string
  sku: string
  description?: string
  category?: string
  unitPrice: number
  costPrice: number
  unit: string
  isActive: boolean
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true },
    description: { type: String, default: null },
    category: { type: String, default: null },
    unitPrice: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    unit: { type: String, default: 'pcs' },
    isActive: { type: Boolean, default: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

productSchema.index({ sku: 1, orgId: 1 }, { unique: true })
productSchema.index({ category: 1, orgId: 1 })

export const Product = model<IProduct>('Product', productSchema)
