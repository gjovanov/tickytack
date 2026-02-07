import { Schema, model, type Document, type Types } from 'mongoose'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'

export interface ILead extends Document {
  name: string
  email?: string
  phone?: string
  company?: string
  source?: string
  status: LeadStatus
  assigneeId?: Types.ObjectId
  convertedContactId?: Types.ObjectId
  convertedDealId?: Types.ObjectId
  orgId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    company: { type: String, default: null },
    source: { type: String, default: null },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
      default: 'new',
    },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    convertedContactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    convertedDealId: { type: Schema.Types.ObjectId, ref: 'Deal', default: null },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  },
  { timestamps: true },
)

leadSchema.index({ status: 1, orgId: 1 })
leadSchema.index({ assigneeId: 1, orgId: 1 })

export const Lead = model<ILead>('Lead', leadSchema)
