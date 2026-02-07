import { Schema, model, type Document, type Types } from 'mongoose'

export interface IBomMaterial {
  productId: Types.ObjectId
  quantity: number
  unitCost: number
}

export interface IBom extends Document {
  name: string
  productId: Types.ObjectId
  materials: IBomMaterial[]
  laborCost: number
  overheadCost: number
  totalCost: number
  isActive: boolean
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const bomMaterialSchema = new Schema<IBomMaterial>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
  },
  { _id: false },
)

const bomSchema = new Schema<IBom>(
  {
    name: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    materials: [bomMaterialSchema],
    laborCost: { type: Number, default: 0 },
    overheadCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

bomSchema.index({ productId: 1, orgId: 1 })

export const Bom = model<IBom>('Bom', bomSchema)
