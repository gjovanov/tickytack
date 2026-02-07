import { Schema, model, type Document, type Types } from 'mongoose'

export type ContactType = 'customer' | 'vendor' | 'both'

export interface IContact extends Document {
  name: string
  email?: string
  phone?: string
  address?: string
  taxId?: string
  type: ContactType
  isActive: boolean
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const contactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    taxId: { type: String, default: null },
    type: {
      type: String,
      enum: ['customer', 'vendor', 'both'],
      default: 'customer',
    },
    isActive: { type: Boolean, default: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

contactSchema.index({ name: 1, orgId: 1 })
contactSchema.index({ type: 1, orgId: 1 })

export const Contact = model<IContact>('Contact', contactSchema)
