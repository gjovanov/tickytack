import { Schema, model, type Document, type Types } from 'mongoose'

export interface IWarehouse extends Document {
  name: string
  code: string
  address?: string
  isActive: boolean
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const warehouseSchema = new Schema<IWarehouse>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    address: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

warehouseSchema.index({ code: 1, orgId: 1 }, { unique: true })

export const Warehouse = model<IWarehouse>('Warehouse', warehouseSchema)
